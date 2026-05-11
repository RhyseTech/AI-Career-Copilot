import json
import re
from typing import Iterable

from fastapi import APIRouter

from models.schemas import InterviewQuestion, InterviewRequest, InterviewResponse
from services.groq_client import groq_chat
from services.jd_parser import parse_job_description
from services.resume_parser import extract_skills_from_text

router = APIRouter()

INTERVIEW_SYSTEM = """You are an expert interview coach with deep knowledge of technical, behavioral,
system design, product, data, cloud, DevOps, QA, enterprise, and software interviews.
Generate personalized, role-aware interview questions.
Always respond with valid JSON only."""

INTERVIEW_USER_TEMPLATE = """Generate {requested_count} personalized interview questions for this candidate.

Requirements:
- Return at least {requested_count} questions.
- Mix behavioral, technical, situational, project/system-design, and stakeholder/leadership questions where relevant.
- Make technical questions directly reflect the job description and the candidate's likely weak spots.
- Do not repeat or closely paraphrase any question from the exclude list.

Respond in JSON:
{{
  "questions": [
    {{
      "category": "behavioral | technical | situational",
      "focus_area": "short topic label",
      "difficulty": "easy | medium | hard",
      "question": "The full interview question",
      "ideal_answer": "A practical and impressive answer outline the candidate could give.",
      "coaching_tip": "What the interviewer is really evaluating"
    }}
  ]
}}

CANDIDATE RESUME SUMMARY:
{resume_text}

JOB DESCRIPTION:
{job_description}

SKILL GAPS:
{skill_gaps}

EXCLUDE THESE QUESTIONS:
{exclude_questions}
"""


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def _to_question(
    category: str,
    focus_area: str,
    difficulty: str,
    question: str,
    ideal_answer: str,
    coaching_tip: str,
) -> InterviewQuestion:
    return InterviewQuestion(
        category=category,
        focus_area=focus_area,
        difficulty=difficulty,
        question=question,
        ideal_answer=ideal_answer,
        coaching_tip=coaching_tip,
    )


def _dedupe_questions(
    questions: Iterable[InterviewQuestion],
    exclude_questions: list[str],
) -> list[InterviewQuestion]:
    seen = {_normalize_text(question) for question in exclude_questions if question}
    unique_questions: list[InterviewQuestion] = []
    for item in questions:
        normalized = _normalize_text(item.question)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_questions.append(item)
    return unique_questions


def _build_behavioral_questions(role_title: str) -> list[InterviewQuestion]:
    role_label = role_title or "this role"
    return [
        _to_question(
            "behavioral",
            "Career Story",
            "easy",
            f"Walk me through your background and why it makes you a strong fit for {role_label}.",
            "Give a crisp 90-second story: where you started, the strongest projects you delivered, and why those wins line up with the role you are targeting now.",
            "The interviewer is checking clarity, relevance, and whether you can connect your past work to the new role quickly.",
        ),
        _to_question(
            "behavioral",
            "Ownership",
            "medium",
            "Tell me about a time you owned a difficult problem end-to-end and what changed because of your work.",
            "Use STAR. Explain the problem, what ownership looked like, the decisions you made, and the measurable outcome for users, revenue, quality, or speed.",
            "They want evidence that you can lead execution instead of waiting for direction.",
        ),
        _to_question(
            "behavioral",
            "Debugging",
            "medium",
            "Describe a production issue or critical bug you solved under pressure.",
            "Explain how you isolated the root cause, communicated status, fixed the issue, and prevented the same class of bug from returning.",
            "This tests calm decision-making, technical depth, and communication during stressful moments.",
        ),
        _to_question(
            "behavioral",
            "Learning Velocity",
            "medium",
            "Tell me about a skill you had to learn quickly to deliver a project successfully.",
            "Show the learning plan, how you validated your understanding fast, and the result you achieved after ramping up.",
            "They are measuring how quickly you can close a gap when the role changes or the stack evolves.",
        ),
        _to_question(
            "behavioral",
            "Teamwork",
            "medium",
            "Share an example of a disagreement with a teammate or stakeholder and how you handled it.",
            "Focus on listening, clarifying the goal, using data or prototypes, and reaching a solution without damaging trust.",
            "They want to know whether you can work through friction like a mature teammate.",
        ),
        _to_question(
            "behavioral",
            "Prioritization",
            "medium",
            "How have you handled multiple deadlines or competing priorities at the same time?",
            "Describe the framework you used to prioritize, what you communicated, and the tradeoffs you made to protect the highest-value work.",
            "Interviewers use this to judge judgment, not just effort.",
        ),
    ]


def _build_technical_questions(role_title: str, skills: list[str]) -> list[InterviewQuestion]:
    role_label = role_title or "the target role"
    questions: list[InterviewQuestion] = []
    for index, skill in enumerate(skills[:8]):
        difficulty = "hard" if index < 3 else "medium"
        questions.append(
            _to_question(
                "technical",
                skill,
                difficulty,
                f"How would you demonstrate hands-on depth in {skill} for {role_label}, beyond just listing it on your resume?",
                f"Explain the concepts that matter most in {skill}, describe where you have used it, mention a real tradeoff or failure you handled, and close with how you would apply it in this role.",
                f"The interviewer is testing whether your {skill} knowledge is practical, not memorized.",
            )
        )
        questions.append(
            _to_question(
                "technical",
                skill,
                difficulty,
                f"Describe a project where {skill} directly improved reliability, performance, or delivery speed.",
                "Pick one project, define the baseline problem, explain the implementation choices, then quantify the result with metrics, user impact, or engineering efficiency.",
                "They want proof that you can turn tools and frameworks into outcomes.",
            )
        )
    return questions


def _build_gap_questions(skill_gaps: list[str]) -> list[InterviewQuestion]:
    questions: list[InterviewQuestion] = []
    for skill in skill_gaps[:4]:
        questions.append(
            _to_question(
                "situational",
                skill,
                "medium",
                f"You do not yet show strong evidence of {skill}. If you joined tomorrow and had to deliver with it in two weeks, what would your ramp-up plan look like?",
                f"Show a structured plan: learn the core concepts of {skill}, pair with experienced teammates, build a small proof of concept, validate assumptions early, and keep stakeholders updated on risk.",
                "This checks honesty about gaps and whether you can recover quickly without becoming a delivery risk.",
            )
        )
    if not questions:
        questions.append(
            _to_question(
                "situational",
                "Adaptability",
                "medium",
                "If the team asked you to pick up an unfamiliar area on short notice, how would you reduce risk and still deliver?",
                "Explain how you would break the work into learning and delivery tracks, seek examples from the existing codebase, validate assumptions early, and communicate openly about risk.",
                "They want to see structure, not overconfidence.",
            )
        )
    return questions


def _build_design_questions(role_title: str, skills: list[str]) -> list[InterviewQuestion]:
    anchor = skills[0] if skills else "the product stack"
    role_label = role_title or "the target role"
    return [
        _to_question(
            "technical",
            "System Design",
            "hard",
            f"Design a realistic solution you might own in {role_label}. What components would you choose, how would data flow, and where would the biggest risks be?",
            f"Start with the user need, define the main components, explain why {anchor} matters in the architecture, then cover scaling, observability, testing, and tradeoffs.",
            "This reveals how you think when there is no single correct answer.",
        ),
        _to_question(
            "technical",
            "Project Deep Dive",
            "hard",
            "Pick the strongest project on your resume and explain the architecture, the hardest tradeoff, and what you would improve now.",
            "Describe the business goal, system boundaries, data flow, key decisions, and one thing you would redesign after seeing production usage.",
            "Interviewers use this to separate builders from buzzword collectors.",
        ),
    ]


def _build_stakeholder_question(role_title: str, seniority: str) -> list[InterviewQuestion]:
    if seniority in {"lead", "manager", "director"}:
        return [
            _to_question(
                "behavioral",
                "Leadership",
                "hard",
                f"How would you align engineers, product, and business stakeholders when priorities conflict on a {role_title or 'high-impact'} initiative?",
                "Talk through how you clarify goals, surface tradeoffs, make scope decisions, and keep teams aligned through written updates and decision logs.",
                "This checks leadership maturity and your ability to create alignment without drama.",
            )
        ]
    return [
        _to_question(
            "behavioral",
            "Stakeholder Management",
            "medium",
            "Tell me about a time you translated a technical issue into language that a non-technical stakeholder could understand.",
            "Explain the business risk in plain language, propose options with tradeoffs, and show how that communication helped the team make the right decision.",
            "They are testing communication range, not just technical fluency.",
        )
    ]


def _build_generic_questions(role_title: str) -> list[InterviewQuestion]:
    role_label = role_title or "this role"
    return [
        _to_question(
            "behavioral",
            "Motivation",
            "easy",
            f"Why does {role_label} interest you right now, and what would success look like in your first 90 days?",
            "Show that you understand the role, name the impact you want to make, and outline a grounded first-90-day plan focused on learning, shipping, and trust-building.",
            "They want to see intent and realism.",
        ),
        _to_question(
            "technical",
            "Quality",
            "medium",
            "How do you make sure your work is maintainable, testable, and easy for another engineer to pick up later?",
            "Talk about naming, modularity, tests, observability, documentation, and the review habits you use to keep quality high.",
            "This checks whether you build for the team, not just for yourself.",
        ),
    ]


def _build_fallback_questions(request: InterviewRequest, requested_count: int) -> list[InterviewQuestion]:
    jd_parsed = parse_job_description(request.job_description)
    role_title = jd_parsed.get("role_title", "")
    seniority = jd_parsed.get("seniority_level", "mid")
    jd_skills = list(
        dict.fromkeys((jd_parsed.get("required_skills", []) or []) + (jd_parsed.get("tools", []) or []))
    )
    resume_skills = extract_skills_from_text(request.resume_text)
    focus_skills = jd_skills[:6] or request.skill_gaps[:6] or resume_skills[:6]

    question_pool = (
        _build_behavioral_questions(role_title)
        + _build_technical_questions(role_title, focus_skills)
        + _build_gap_questions(request.skill_gaps)
        + _build_design_questions(role_title, focus_skills)
        + _build_stakeholder_question(role_title, seniority)
        + _build_generic_questions(role_title)
    )

    unique_questions = _dedupe_questions(question_pool, request.exclude_questions)
    return unique_questions[:requested_count]


@router.post("/interview", response_model=InterviewResponse)
async def generate_interview_questions(request: InterviewRequest):
    requested_count = max(5, min(request.requested_count or 18, 20))
    exclude_questions = request.exclude_questions or []

    prompt = INTERVIEW_USER_TEMPLATE.format(
        requested_count=requested_count,
        resume_text=request.resume_text[:2400],
        job_description=request.job_description[:1800],
        skill_gaps=", ".join(request.skill_gaps) if request.skill_gaps else "None identified",
        exclude_questions="\n".join(f"- {question}" for question in exclude_questions[:20]) or "None",
    )

    llm_questions: list[InterviewQuestion] = []
    try:
        raw = groq_chat(INTERVIEW_SYSTEM, prompt, temperature=0.45, max_tokens=1800)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw).strip()
        result = json.loads(raw)
        llm_questions = [
            InterviewQuestion(
                category=q.get("category", "technical"),
                focus_area=q.get("focus_area", ""),
                difficulty=q.get("difficulty", "medium"),
                question=q.get("question", ""),
                ideal_answer=q.get("ideal_answer", ""),
                coaching_tip=q.get("coaching_tip", ""),
            )
            for q in result.get("questions", [])
            if q.get("question")
        ]
    except Exception:
        llm_questions = []

    combined = _dedupe_questions(llm_questions, exclude_questions)
    if len(combined) < requested_count:
        fallback = _build_fallback_questions(request, requested_count * 2)
        combined = _dedupe_questions([*combined, *fallback], exclude_questions)

    return InterviewResponse(questions=combined[:requested_count])

from fastapi import APIRouter, HTTPException
from models.schemas import InterviewRequest, InterviewResponse, InterviewQuestion
from services.groq_client import groq_chat
import re
import json

router = APIRouter()

INTERVIEW_SYSTEM = """You are an expert interview coach with deep knowledge of technical and behavioral interviews.
Generate highly targeted, insightful interview questions.
Always respond with valid JSON only."""

INTERVIEW_USER_TEMPLATE = """Generate 10 personalized interview questions for this candidate applying to the role.

Mix of:
- 4 behavioral questions (STAR format)
- 4 technical questions (based on JD skills)
- 2 situational/gap-based questions (based on missing skills)

Respond in JSON:
{{
  "questions": [
    {{
      "category": "behavioral | technical | situational",
      "question": "The full interview question",
      "ideal_answer": "A complete, impressive example answer the candidate could give, using context from their resume."
    }}
  ]
}}

CANDIDATE RESUME SUMMARY:
{resume_text}

JOB DESCRIPTION:
{job_description}

SKILL GAPS (focus on these for situational questions):
{skill_gaps}
"""


@router.post("/interview", response_model=InterviewResponse)
async def generate_interview_questions(request: InterviewRequest):
    gaps_str = ", ".join(request.skill_gaps) if request.skill_gaps else "None identified"
    
    prompt = INTERVIEW_USER_TEMPLATE.format(
        resume_text=request.resume_text[:2000],
        job_description=request.job_description[:1500],
        skill_gaps=gaps_str,
    )

    raw = groq_chat(INTERVIEW_SYSTEM, prompt, temperature=0.5)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
        questions = [
            InterviewQuestion(
                category=q.get("category", "technical"),
                question=q.get("question", ""),
                ideal_answer=q.get("ideal_answer", ""),
            )
            for q in result.get("questions", [])
            if q.get("question")
        ]
        return InterviewResponse(questions=questions)
    except (json.JSONDecodeError, Exception):
        return InterviewResponse(questions=[
            InterviewQuestion(
                category="behavioral",
                question="Tell me about yourself and your most impactful project.",
                ideal_answer="Structure your answer using the STAR method (Situation, Task, Action, Result) to highlight your biggest career wins.",
            )
        ])

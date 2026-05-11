import json
import re
from urllib.parse import quote_plus

from fastapi import APIRouter

from models.schemas import RoadmapRequest, RoadmapResponse, RoadmapWeek, StudyTopic
from services.groq_client import groq_chat

router = APIRouter()

ROADMAP_SYSTEM = """You are a strategic career development advisor.
Create clear, practical study roadmaps that help a candidate close role-specific skill gaps.
Always respond with valid JSON only."""

ROADMAP_USER_TEMPLATE = """Create a focused study roadmap for this candidate.

Skill gaps: {skill_gaps}
Current role: {current_role}
Target role: {target_role}

Respond in JSON:
{{
  "headline": "One sentence summary of the study strategy",
  "study_plan": [
    {{
      "topic": "specific skill or topic to study",
      "priority": "high | medium | low",
      "why_it_matters": "why this topic matters for the target role",
      "estimated_time": "for example 5-7 days",
      "study_actions": ["action 1", "action 2", "action 3"],
      "practice_task": "a concrete task or mini project"
    }}
  ],
  "thirty_day_plan": [
    {{
      "week": "Week 1",
      "focus": "theme for the week",
      "actions": ["action 1", "action 2"],
      "resources": ["resource suggestion"]
    }}
  ],
  "sixty_day_plan": [
    {{
      "week": "Week 5",
      "focus": "theme for the week",
      "actions": ["action 1", "action 2"],
      "resources": ["resource suggestion"]
    }}
  ],
  "certifications": ["optional cert"],
  "projects": ["portfolio project idea"]
}}

Rules:
- Make the roadmap concrete and skill-based, not vague.
- Prefer 4 to 6 study topics.
- Make weekly actions realistic for a working candidate.
"""


def _search_link(query: str, platform: str) -> str:
    encoded = quote_plus(query)
    if platform == "google":
        return f"https://www.google.com/search?q={encoded}"
    return f"https://www.youtube.com/results?search_query={encoded}"


YOUTUBE_TOP_RESOURCES = [
    (("python",), "https://www.youtube.com/watch?v=rfscVS0vtbw"),
    (("java",), "https://www.youtube.com/watch?v=eIrMbAQSU34"),
    (("node", "node.js"), "https://www.youtube.com/watch?v=TlB_eWDSMt4"),
    (("react",), "https://www.youtube.com/watch?v=bMknfKXIFA8"),
    (("sql",), "https://www.youtube.com/watch?v=HXV3zeQKqGY"),
    (("system design",), "https://www.youtube.com/watch?v=bUHFg8CZFws"),
    (("docker",), "https://www.youtube.com/watch?v=3c-iBn73dDE"),
    (("kubernetes", "k8s"), "https://www.youtube.com/watch?v=X48VuDVv0do"),
    (("aws",), "https://www.youtube.com/watch?v=ulprqHHWlng"),
]


def _targeted_google_link(topic: str, role_label: str) -> str:
    query = f"best {topic} tutorial for {role_label} with projects and interview prep"
    return _search_link(query, "google")


def _targeted_youtube_search_link(topic: str, role_label: str) -> str:
    query = f"best {topic} full course with project for {role_label}"
    return _search_link(query, "youtube")


def _best_youtube_link(topic: str, role_label: str) -> str:
    lowered = f"{topic} {role_label}".lower()
    for keyword_group, url in YOUTUBE_TOP_RESOURCES:
        if any(keyword in lowered for keyword in keyword_group):
            return url
    return _targeted_youtube_search_link(topic, role_label)


def _estimate_time(topic: str) -> str:
    lowered = topic.lower()
    if any(keyword in lowered for keyword in ["system design", "architecture", "cloud", "kubernetes", "aws"]):
        return "7-10 days"
    if any(keyword in lowered for keyword in ["react", "node", "python", "testing", "sql", "api"]):
        return "4-6 days"
    return "3-5 days"


def _build_topic(skill: str, index: int, target_role: str) -> StudyTopic:
    priority = "high" if index < 2 else "medium" if index < 4 else "low"
    role_label = target_role or "your target role"
    return StudyTopic(
        topic=skill,
        priority=priority,
        why_it_matters=f"{skill} keeps appearing as an important requirement for {role_label}. Strength here will improve both interview confidence and on-the-job readiness.",
        estimated_time=_estimate_time(skill),
        study_actions=[
            f"Learn the fundamentals and common interview concepts for {skill}.",
            f"Build one small hands-on exercise that proves you can apply {skill}.",
            f"Write down project stories, tradeoffs, and metrics so you can speak about {skill} clearly in interviews.",
        ],
        practice_task=f"Create a mini project or walkthrough that shows how you would use {skill} in a real work scenario.",
        google_link=_targeted_google_link(skill, role_label),
        youtube_link=_best_youtube_link(skill, role_label),
    )


def _default_skill_gaps(request: RoadmapRequest) -> list[str]:
    cleaned = [skill.strip() for skill in request.skill_gaps if skill and skill.strip()]
    if cleaned:
        return list(dict.fromkeys(cleaned))[:6]

    target_role = (request.target_role or "").strip()
    if target_role:
        return [
            f"{target_role} fundamentals",
            f"{target_role} project practice",
            "Interview storytelling",
            "Portfolio proof",
        ]

    return ["Core role fundamentals", "Interview storytelling", "Project practice", "Portfolio proof"]


def _build_week_plan(topic: StudyTopic, week_label: str) -> RoadmapWeek:
    return RoadmapWeek(
        week=week_label,
        focus=topic.topic,
        actions=topic.study_actions,
        resources=[topic.google_link, topic.youtube_link],
    )


def _build_default_roadmap(request: RoadmapRequest) -> RoadmapResponse:
    topics = [_build_topic(skill, index, request.target_role or "") for index, skill in enumerate(_default_skill_gaps(request))]
    first_half = topics[: min(3, len(topics))]
    second_half = topics[min(3, len(topics)) :] or topics[:2]

    thirty_day_plan = [
        _build_week_plan(topic, f"Week {index + 1}")
        for index, topic in enumerate(first_half)
    ]
    sixty_day_plan = [
        _build_week_plan(topic, f"Week {index + 5}")
        for index, topic in enumerate(second_half)
    ]

    role_label = request.target_role or "your target role"
    return RoadmapResponse(
        headline=f"Focus first on the highest-impact gaps for {role_label}, then turn them into project proof and interview stories.",
        study_plan=topics,
        thirty_day_plan=thirty_day_plan,
        sixty_day_plan=sixty_day_plan,
        certifications=[
            f"Look for one role-relevant certification or structured course tied to {topics[0].topic}."
        ] if topics else [],
        projects=[
            f"Build one portfolio project that demonstrates {topic.topic} in a way that matches {role_label}."
            for topic in topics[:3]
        ],
    )


def _parse_weeks(weeks_data: list[dict]) -> list[RoadmapWeek]:
    return [
        RoadmapWeek(
            week=week.get("week", ""),
            focus=week.get("focus", ""),
            actions=week.get("actions", []),
            resources=week.get("resources", []),
        )
        for week in weeks_data
    ]


@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapRequest):
    normalized_gaps = _default_skill_gaps(request)
    prompt = ROADMAP_USER_TEMPLATE.format(
        skill_gaps=", ".join(normalized_gaps),
        current_role=request.current_role or "Not specified",
        target_role=request.target_role or "Not specified",
    )

    parsed_result: dict = {}
    try:
        raw = groq_chat(ROADMAP_SYSTEM, prompt, temperature=0.35, max_tokens=1000)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw).strip()
        parsed_result = json.loads(raw)
    except Exception:
        parsed_result = {}

    fallback = _build_default_roadmap(request)

    study_plan_payload = parsed_result.get("study_plan", []) if isinstance(parsed_result, dict) else []
    study_plan = []
    for index, item in enumerate(study_plan_payload):
        topic = (item.get("topic") or "").strip()
        if not topic:
            continue
        role_label = request.target_role or "job interview prep"
        study_plan.append(
            StudyTopic(
                topic=topic,
                priority=item.get("priority", "medium"),
                why_it_matters=item.get("why_it_matters", ""),
                estimated_time=item.get("estimated_time", _estimate_time(topic)),
                study_actions=item.get("study_actions", []),
                practice_task=item.get("practice_task", ""),
                google_link=_targeted_google_link(topic, role_label),
                youtube_link=_best_youtube_link(topic, role_label),
            )
        )

    if len(study_plan) < 4:
        existing_topics = {topic.topic.lower() for topic in study_plan}
        for topic in fallback.study_plan:
            if topic.topic.lower() in existing_topics:
                continue
            study_plan.append(topic)
            if len(study_plan) >= 5:
                break

    return RoadmapResponse(
        headline=parsed_result.get("headline", "") or fallback.headline,
        study_plan=study_plan or fallback.study_plan,
        thirty_day_plan=_parse_weeks(parsed_result.get("thirty_day_plan", [])) or fallback.thirty_day_plan,
        sixty_day_plan=_parse_weeks(parsed_result.get("sixty_day_plan", [])) or fallback.sixty_day_plan,
        certifications=parsed_result.get("certifications", []) or fallback.certifications,
        projects=parsed_result.get("projects", []) or fallback.projects,
    )

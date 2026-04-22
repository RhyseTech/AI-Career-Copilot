from fastapi import APIRouter, HTTPException
from models.schemas import RoadmapRequest, RoadmapResponse, RoadmapWeek
from services.groq_client import groq_chat
import re
import json

router = APIRouter()

ROADMAP_SYSTEM = """You are a strategic career development advisor.
Create actionable, specific 30/60-day career roadmaps.
Always respond with valid JSON only."""

ROADMAP_USER_TEMPLATE = """Create a detailed career improvement roadmap for a candidate with these skill gaps.

Skill Gaps: {skill_gaps}
Current Role: {current_role}
Target Role: {target_role}

Respond in JSON format:
{{
  "thirty_day_plan": [
    {{
      "week": "Week 1",
      "focus": "Focus area title",
      "actions": ["Action 1", "Action 2", "Action 3"],
      "resources": ["Resource name/URL"]
    }}
  ],
  "sixty_day_plan": [
    {{
      "week": "Week 5",
      "focus": "Focus area title",
      "actions": ["Action 1", "Action 2"],
      "resources": ["Resource name/URL"]
    }}
  ],
  "certifications": ["Recommended cert 1", "Recommended cert 2"],
  "projects": ["Suggested project 1 with brief description", "Project 2"]
}}

30-day plan = Weeks 1-4 (foundations)
60-day plan = Weeks 5-8 (advanced application)
"""


@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapRequest):
    if not request.skill_gaps:
        raise HTTPException(status_code=400, detail="No skill gaps provided.")

    prompt = ROADMAP_USER_TEMPLATE.format(
        skill_gaps=", ".join(request.skill_gaps),
        current_role=request.current_role or "Not specified",
        target_role=request.target_role or "Not specified",
    )

    raw = groq_chat(ROADMAP_SYSTEM, prompt, temperature=0.4)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
        
        def parse_weeks(weeks_data):
            return [
                RoadmapWeek(
                    week=w.get("week", ""),
                    focus=w.get("focus", ""),
                    actions=w.get("actions", []),
                    resources=w.get("resources", []),
                )
                for w in weeks_data
            ]

        return RoadmapResponse(
            thirty_day_plan=parse_weeks(result.get("thirty_day_plan", [])),
            sixty_day_plan=parse_weeks(result.get("sixty_day_plan", [])),
            certifications=result.get("certifications", []),
            projects=result.get("projects", []),
        )
    except (json.JSONDecodeError, Exception) as e:
        return RoadmapResponse(
            thirty_day_plan=[
                RoadmapWeek(
                    week="Week 1-4",
                    focus="Core Skill Development",
                    actions=["Identify online courses for missing skills", "Set daily learning goals", "Join relevant communities"],
                    resources=["Coursera", "Udemy", "YouTube"],
                )
            ],
            sixty_day_plan=[
                RoadmapWeek(
                    week="Week 5-8",
                    focus="Practical Application",
                    actions=["Build a portfolio project", "Contribute to open source", "Apply for target roles"],
                    resources=["GitHub", "LinkedIn", "Job boards"],
                )
            ],
            certifications=["Relevant industry certification"],
            projects=["Build a project demonstrating target skills"],
        )

import json
import re
from typing import List
from services.groq_client import groq_chat


GAP_SYSTEM_PROMPT = """You are a senior career coach and skill development expert.
Analyze skill gaps and provide actionable, specific recommendations.
Always respond with valid JSON only — no markdown, no explanations.
"""

GAP_USER_TEMPLATE = """A candidate is missing these skills required for the job:
Missing Skills: {missing_skills}

Current Role Context: {current_role}
Target Role: {target_role}

For each missing skill gap, provide a structured analysis in JSON:
{{
  "skill_gaps": [
    {{
      "skill": "skill name",
      "priority": "high | medium | low",
      "reason": "why this skill matters for the role",
      "how_to_learn": "specific resource or approach",
      "time_estimate": "estimated time to basic proficiency"
    }}
  ],
  "experience_gaps": [
    "description of experience-level gaps, e.g. 'No leadership experience in cross-functional teams'"
  ],
  "quick_wins": [
    "skills/certifications candidate can add quickly (< 2 weeks)"
  ]
}}

Missing Skills: {missing_skills}
"""


def analyze_gaps(
    missing_skills: List[str],
    jd_text: str,
    resume_text: str,
    current_role: str = "",
    target_role: str = "",
) -> dict:
    """
    Use Groq to analyze skill gaps and provide structured recommendations.
    """
    skills_str = ", ".join(missing_skills) if missing_skills else "None identified"
    
    prompt = GAP_USER_TEMPLATE.format(
        missing_skills=skills_str,
        current_role=current_role or "Not specified",
        target_role=target_role or "Not specified",
    )
    
    raw = groq_chat(GAP_SYSTEM_PROMPT, prompt, temperature=0.2)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()
    
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "skill_gaps": [
                {"skill": s, "priority": "medium", "reason": "Required by job description",
                 "how_to_learn": "Online courses (Coursera, Udemy)", "time_estimate": "2-4 weeks"}
                for s in missing_skills
            ],
            "experience_gaps": [],
            "quick_wins": [],
        }
    
    return result

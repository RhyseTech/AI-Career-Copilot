"""
Blind Spot Detector — identifies what a resume is missing based on role expectations.
Uses Groq LLM to compare resume against industry norms.
"""
import json
import re
from services.groq_client import groq_chat


BLINDSPOT_SYSTEM = """You are a senior career strategist with 20 years of executive recruiting experience.
You specialize in identifying what candidates FORGOT to include in their resume — not what they have.
Always respond with valid JSON only — no markdown, no explanations."""

BLINDSPOT_TEMPLATE = """Analyze this resume for a candidate targeting this role. Identify what's MISSING from the resume — themes, skills, achievements, or sections that similar successful candidates always include but this person forgot.

RESUME:
{resume_text}

TARGET ROLE REQUIREMENTS:
{jd_summary}

Respond in JSON:
{{
  "blind_spots": [
    {{
      "category": "missing_theme | missing_skill | missing_section | weak_narrative",
      "title": "Short title of the blind spot",
      "description": "Detailed explanation of what's missing and why it matters",
      "fix": "Specific action the candidate should take to address this",
      "impact": "high | medium | low"
    }}
  ],
  "overall_assessment": "1-2 sentence assessment of the resume's completeness for this role"
}}

Identify 4-6 specific blind spots. Focus on what's ABSENT, not what's present."""


def detect_blind_spots(resume_text: str, jd_text: str, jd_skills: list[str] = None) -> dict:
    """
    Detect resume blind spots — what the candidate forgot to mention.
    """
    jd_summary = jd_text[:2000]
    if jd_skills:
        jd_summary += f"\n\nKey skills required: {', '.join(jd_skills[:15])}"

    prompt = BLINDSPOT_TEMPLATE.format(
        resume_text=resume_text[:3000],
        jd_summary=jd_summary,
    )

    raw = groq_chat(BLINDSPOT_SYSTEM, prompt, temperature=0.3)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "blind_spots": [
                {
                    "category": "missing_theme",
                    "title": "Unable to analyze",
                    "description": "Could not generate blind spot analysis. Try again with more resume content.",
                    "fix": "Ensure your resume has substantial content.",
                    "impact": "medium",
                }
            ],
            "overall_assessment": "Analysis could not be completed.",
        }

    return result

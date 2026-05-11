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
    jd_summary = jd_text[:1400]
    if jd_skills:
        jd_summary += f"\n\nKey skills required: {', '.join(jd_skills[:15])}"

    prompt = BLINDSPOT_TEMPLATE.format(
        resume_text=resume_text[:2200],
        jd_summary=jd_summary,
    )

    try:
        raw = groq_chat(BLINDSPOT_SYSTEM, prompt, temperature=0.3, max_tokens=700)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw).strip()
    except Exception:
        # Graceful fallback for rate limits/network/model issues.
        fallback_blind_spots = []
        for skill in (jd_skills or [])[:4]:
            fallback_blind_spots.append(
                {
                    "category": "missing_skill",
                    "title": f"Evidence missing for {skill}",
                    "description": f"The resume does not clearly demonstrate {skill} in delivered outcomes.",
                    "fix": f"Add one measurable bullet showing how you used {skill} and what result it produced.",
                    "impact": "high",
                }
            )
        if not fallback_blind_spots:
            fallback_blind_spots.append(
                {
                    "category": "missing_section",
                    "title": "Impact-focused evidence is thin",
                    "description": "The resume could use clearer outcome-based bullets for role fit.",
                    "fix": "Add quantified impact bullets tied to performance, delivery speed, or reliability.",
                    "impact": "medium",
                }
            )
        return {
            "blind_spots": fallback_blind_spots,
            "overall_assessment": "Blind spot analysis returned fallback output due to temporary AI service limits.",
        }

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

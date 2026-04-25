"""
LinkedIn Profile Optimizer — AI-powered audit and rewrite of LinkedIn sections.
"""
import json
import re
from services.groq_client import groq_chat


LINKEDIN_SYSTEM = """You are a LinkedIn optimization expert and personal branding strategist.
You specialize in making profiles highly discoverable by recruiters and hiring managers.
Always respond with valid JSON only — no markdown, no explanations."""

LINKEDIN_TEMPLATE = """Optimize this LinkedIn profile for maximum recruiter discoverability for the target role.

CURRENT LINKEDIN PROFILE:
Headline: {current_headline}
About Section: {current_about}
Skills Listed: {current_skills}

TARGET ROLE: {target_role}
KEY SKILLS NEEDED: {key_skills}

Respond in JSON:
{{
  "optimized_headline": "New keyword-rich, differentiated headline (max 220 chars)",
  "headline_reasoning": "Why this headline works better",
  "optimized_about": "Full rewritten About section (300-500 words). Narrative arc, not resume copy.",
  "about_reasoning": "Key changes made and why",
  "skills_to_add": ["Skill 1", "Skill 2", "Skill 3"],
  "skills_to_remove": ["Outdated or irrelevant skill"],
  "skills_to_prioritize": ["Top skill to feature first", "Second priority"],
  "activity_suggestions": [
    "Content idea 1 to post on LinkedIn to increase visibility",
    "Content idea 2",
    "Content idea 3"
  ],
  "connection_strategy": "Brief strategy for building connections that help reach the target role",
  "profile_score_before": 45,
  "profile_score_after": 82,
  "top_improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}}"""


def optimize_linkedin_profile(
    current_headline: str = "",
    current_about: str = "",
    current_skills: str = "",
    target_role: str = "",
    key_skills: list[str] = None,
) -> dict:
    """Generate LinkedIn profile optimization recommendations."""
    skills_str = ", ".join(key_skills[:10]) if key_skills else "Not specified"

    prompt = LINKEDIN_TEMPLATE.format(
        current_headline=current_headline or "Not provided",
        current_about=current_about[:1500] or "Not provided",
        current_skills=current_skills or "Not provided",
        target_role=target_role or "Not specified",
        key_skills=skills_str,
    )

    raw = groq_chat(LINKEDIN_SYSTEM, prompt, temperature=0.4)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "optimized_headline": "Unable to generate. Please try again.",
            "headline_reasoning": "",
            "optimized_about": "Unable to generate. Please try again.",
            "about_reasoning": "",
            "skills_to_add": [],
            "skills_to_remove": [],
            "skills_to_prioritize": [],
            "activity_suggestions": [],
            "connection_strategy": "",
            "profile_score_before": 0,
            "profile_score_after": 0,
            "top_improvements": [],
        }

    return result

"""
Salary Intelligence Engine — LLM-generated salary benchmarks, negotiation scripts,
and compensation analysis. Free tier: powered entirely by Groq.
"""
import json
import re
from services.groq_client import groq_chat


SALARY_SYSTEM = """You are a senior compensation analyst and salary negotiation expert.
You have deep knowledge of global salary data across tech, SAP, and enterprise roles.
Always respond with valid JSON only — no markdown, no explanations."""

SALARY_TEMPLATE = """Provide comprehensive salary intelligence for this role.

Role: {role_title}
Location: {location}
Seniority Level: {seniority}
Years of Experience: {years_experience}
Key Skills: {key_skills}

Respond in JSON:
{{
  "salary_range": {{
    "low": "lowest typical salary (with currency)",
    "median": "median salary (with currency)",
    "high": "top-end salary (with currency)",
    "currency": "INR or USD"
  }},
  "factors_affecting_pay": [
    "Factor 1 and its impact on salary",
    "Factor 2 and its impact"
  ],
  "negotiation_script": {{
    "opening": "How to open the salary conversation",
    "counter_offer": "Script for countering a low offer",
    "walk_away_signal": "How to know when to walk away",
    "closing": "How to close the negotiation positively"
  }},
  "total_comp_breakdown": {{
    "base_salary_pct": 70,
    "bonus_pct": 15,
    "equity_pct": 10,
    "benefits_pct": 5,
    "notes": "Brief explanation of typical comp structure for this role"
  }},
  "market_insight": "2-3 sentences about the current market for this role — demand, supply, trends"
}}

Use realistic salary data for the location and role. If unsure, provide reasonable estimates with a disclaimer.
For India, use INR. For US/Europe, use USD/EUR."""


def get_salary_intelligence(
    role_title: str,
    location: str = "India",
    seniority: str = "mid",
    years_experience: str = "5-8",
    key_skills: list[str] = None,
) -> dict:
    """Generate salary intelligence for a role."""
    skills_str = ", ".join(key_skills[:10]) if key_skills else "Not specified"

    prompt = SALARY_TEMPLATE.format(
        role_title=role_title,
        location=location,
        seniority=seniority,
        years_experience=years_experience,
        key_skills=skills_str,
    )

    raw = groq_chat(SALARY_SYSTEM, prompt, temperature=0.3, max_tokens=850)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "salary_range": {
                "low": "Unable to estimate",
                "median": "Unable to estimate",
                "high": "Unable to estimate",
                "currency": "INR",
            },
            "factors_affecting_pay": ["Could not generate salary data. Please try again."],
            "negotiation_script": {
                "opening": "Research the market rate for your role before discussions.",
                "counter_offer": "Present data-backed salary expectations.",
                "walk_away_signal": "Know your minimum acceptable offer.",
                "closing": "Express enthusiasm for the role while being firm on compensation.",
            },
            "total_comp_breakdown": {
                "base_salary_pct": 70,
                "bonus_pct": 15,
                "equity_pct": 10,
                "benefits_pct": 5,
                "notes": "Standard breakdown for most roles.",
            },
            "market_insight": "Unable to generate market insight at this time.",
        }

    # Add disclaimer
    result["disclaimer"] = (
        "These salary estimates are AI-generated based on general market data. "
        "Actual compensation varies by company, negotiation, and market conditions. "
        "Always cross-reference with sources like Glassdoor, Levels.fyi, and AmbitionBox."
    )

    return result

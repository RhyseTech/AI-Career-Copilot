"""
Recruiter Signal Intelligence — simulates how a recruiter perceives a candidate's profile.
Unique differentiator: no competitor offers this.
"""
import json
import re
from datetime import datetime, timezone

from services.groq_client import groq_chat


RECRUITER_SYSTEM = """You are a senior technical recruiter with 15 years of experience at top companies.
You've screened 50,000+ resumes. You know exactly what makes a recruiter stop scrolling or skip a profile.
Always respond with valid JSON only — no markdown, no explanations."""

RECRUITER_TEMPLATE = """Simulate how a recruiter would evaluate this candidate for the given role.
Think step-by-step like a real recruiter reviewing applications.

CANDIDATE RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

MATCH SCORE: {match_score}%

Respond in JSON:
{{
  "recruiter_verdict": "shortlist | maybe | likely_skip | auto_reject",
  "verdict_reasoning": "2-3 sentences explaining the recruiter's likely reaction",
  "first_impression": "What a recruiter notices in the first 6 seconds of scanning this resume",
  "skip_reasons": [
    {{
      "reason": "Specific reason a recruiter might skip this resume",
      "fix": "Exact change to make to address this"
    }}
  ],
  "strengths_noticed": ["What stands out positively to a recruiter"],
  "pile_position": {{
    "estimated_rank": "top_10_pct | top_25_pct | top_50_pct | bottom_50_pct",
    "explanation": "Why this candidate would land in this position"
  }},
  "shortlist_fixes": [
    "Change 1 that would move this candidate from 'maybe' to 'shortlist'",
    "Change 2",
    "Change 3"
  ],
  "ats_pass_prediction": true,
  "interview_likelihood_pct": 35
}}

Be brutally honest — recruiters are. But also be constructive.
Provide 3-4 skip reasons and 3 specific shortlist fixes."""


def get_recruiter_signals(
    resume_text: str,
    jd_text: str,
    match_score: float = 0,
) -> dict:
    """Simulate recruiter evaluation of a candidate's profile."""
    prompt = RECRUITER_TEMPLATE.format(
        resume_text=resume_text[:3000],
        jd_text=jd_text[:2000],
        match_score=match_score,
    )

    try:
        raw = groq_chat(RECRUITER_SYSTEM, prompt, temperature=0.4)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw).strip()
        result = json.loads(raw)
    except Exception:
        result = {
            "recruiter_verdict": "unknown",
            "verdict_reasoning": "Could not generate recruiter analysis. Please try again.",
            "first_impression": "",
            "skip_reasons": [],
            "strengths_noticed": [],
            "pile_position": {
                "estimated_rank": "unknown",
                "explanation": "Unable to estimate.",
            },
            "shortlist_fixes": [],
            "ats_pass_prediction": None,
            "interview_likelihood_pct": 0,
        }

    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    result["live_market_data_available"] = False
    result["market_data_note"] = (
        "Live hiring feed is not connected right now, so this view is based on your resume and target JD."
    )
    result["mock_interview_focus"] = result.get("shortlist_fixes", [])[:3]

    return result

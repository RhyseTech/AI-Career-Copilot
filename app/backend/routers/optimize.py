from fastapi import APIRouter, HTTPException
from models.schemas import OptimizeRequest, OptimizeResponse
from services.groq_client import groq_chat
import re
import json

router = APIRouter()

OPTIMIZE_SYSTEM = """You are an elite resume writer and ATS optimization expert with 20 years of experience.
Your rewrites are powerful, quantified, and keyword-rich.
Always respond with valid JSON only."""

OPTIMIZE_USER_TEMPLATE = """Rewrite and optimize this resume to perfectly match the job description.

Rules:
1. Use strong action verbs
2. Add quantified impact where possible (e.g., "Reduced processing time by 40%")
3. Align keywords with the JD naturally
4. Keep ATS-friendly formatting
5. Preserve authenticity — do not fabricate facts
6. Enhance impact of existing bullets

Respond in JSON:
{{
  "optimized_resume": "full rewritten resume text here",
  "key_changes": ["list of top 5 changes made and why"],
  "ats_score_estimate": 85
}}

ORIGINAL RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_resume(request: OptimizeRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    prompt = OPTIMIZE_USER_TEMPLATE.format(
        resume_text=request.resume_text[:3000],
        job_description=request.job_description[:2000],
    )

    raw = groq_chat(OPTIMIZE_SYSTEM, prompt, temperature=0.35)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
        return OptimizeResponse(
            optimized_resume=result.get("optimized_resume", request.resume_text),
            key_changes=result.get("key_changes", []),
            ats_score_estimate=int(result.get("ats_score_estimate", 80)),
        )
    except (json.JSONDecodeError, ValueError):
        return OptimizeResponse(
            optimized_resume=raw,
            key_changes=["Resume rewritten to align with job description keywords"],
            ats_score_estimate=78,
        )

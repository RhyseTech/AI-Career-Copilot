from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.ats_emulator import emulate_ats_score

router = APIRouter()


class ATSRequest(BaseModel):
    resume_text: str
    jd_skills: Optional[List[str]] = []


class ATSResponse(BaseModel):
    overall_score: float
    section_score: float
    format_score: float
    keyword_score: float
    impact_score: float
    sections_detected: dict
    formatting: dict
    keyword_alignment: dict
    recommendations: List[str]


@router.post("/ats-score", response_model=ATSResponse)
async def ats_score(request: ATSRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")

    result = emulate_ats_score(request.resume_text, request.jd_skills or [])
    return ATSResponse(**result)

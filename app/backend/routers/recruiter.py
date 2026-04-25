from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.recruiter_signal import get_recruiter_signals

router = APIRouter()


class RecruiterRequest(BaseModel):
    resume_text: str
    jd_text: str
    match_score: Optional[float] = 0


@router.post("/recruiter-signal")
async def recruiter_signal(request: RecruiterRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    if not request.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    result = get_recruiter_signals(
        resume_text=request.resume_text,
        jd_text=request.jd_text,
        match_score=request.match_score or 0,
    )
    return result

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.linkedin_optimizer import optimize_linkedin_profile

router = APIRouter()


class LinkedInRequest(BaseModel):
    current_headline: Optional[str] = ""
    current_about: Optional[str] = ""
    current_skills: Optional[str] = ""
    target_role: Optional[str] = ""
    key_skills: Optional[List[str]] = []


@router.post("/linkedin-optimize")
async def linkedin_optimize(request: LinkedInRequest):
    if not request.target_role and not request.current_headline:
        raise HTTPException(
            status_code=400,
            detail="Provide at least a target role or current headline."
        )

    result = optimize_linkedin_profile(
        current_headline=request.current_headline or "",
        current_about=request.current_about or "",
        current_skills=request.current_skills or "",
        target_role=request.target_role or "",
        key_skills=request.key_skills or [],
    )
    return result

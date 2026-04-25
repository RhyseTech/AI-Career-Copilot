from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.salary_engine import get_salary_intelligence

router = APIRouter()


class SalaryRequest(BaseModel):
    role_title: str
    location: Optional[str] = "India"
    seniority: Optional[str] = "mid"
    years_experience: Optional[str] = "5-8"
    key_skills: Optional[List[str]] = []


@router.post("/salary")
async def salary_intelligence(request: SalaryRequest):
    if not request.role_title.strip():
        raise HTTPException(status_code=400, detail="Role title is required.")

    result = get_salary_intelligence(
        role_title=request.role_title,
        location=request.location or "India",
        seniority=request.seniority or "mid",
        years_experience=request.years_experience or "5-8",
        key_skills=request.key_skills or [],
    )
    return result

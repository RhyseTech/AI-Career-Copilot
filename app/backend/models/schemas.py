from pydantic import BaseModel
from typing import List, Optional


class AnalyzeRequest(BaseModel):
    job_description: str


class SkillGap(BaseModel):
    skill: str
    priority: str  # "high", "medium", "low"
    reason: str


class AnalyzeResponse(BaseModel):
    match_score: float
    resume_text: str
    parsed_skills: List[str]
    parsed_experience: List[str]
    jd_required_skills: List[str]
    jd_seniority: str
    skill_gaps: List[SkillGap]
    matched_skills: List[str]
    experience_gaps: List[str]
    summary: str


class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str


class OptimizeResponse(BaseModel):
    optimized_resume: str
    key_changes: List[str]
    ats_score_estimate: int


class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str
    skill_gaps: Optional[List[str]] = []


class InterviewQuestion(BaseModel):
    category: str  # "behavioral", "technical", "situational"
    question: str
    ideal_answer: str


class InterviewResponse(BaseModel):
    questions: List[InterviewQuestion]


class RoadmapRequest(BaseModel):
    skill_gaps: List[str]
    current_role: Optional[str] = ""
    target_role: Optional[str] = ""


class RoadmapWeek(BaseModel):
    week: str
    focus: str
    actions: List[str]
    resources: List[str]


class RoadmapResponse(BaseModel):
    thirty_day_plan: List[RoadmapWeek]
    sixty_day_plan: List[RoadmapWeek]
    certifications: List[str]
    projects: List[str]

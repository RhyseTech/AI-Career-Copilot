from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    job_description: Optional[str] = ""
    job_description_url: Optional[str] = ""


class SkillGap(BaseModel):
    skill: str
    priority: str  # "high", "medium", "low"
    reason: str
    how_to_learn: Optional[str] = ""
    time_estimate: Optional[str] = ""


class AnalyzeResponse(BaseModel):
    match_score: float
    resume_text: str
    job_description_text: str = ""
    job_description_source: str = "text"
    job_description_source_label: str = ""
    parsed_skills: List[str] = Field(default_factory=list)
    parsed_experience: List[str] = Field(default_factory=list)
    jd_required_skills: List[str] = Field(default_factory=list)
    jd_seniority: str
    skill_gaps: List[SkillGap] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    experience_gaps: List[str] = Field(default_factory=list)
    summary: str
    quick_wins: List[str] = Field(default_factory=list)
    blind_spots: List[str] = Field(default_factory=list)
    confidence_score: Dict[str, float | str | Dict[str, float]] | None = None
    ats_score: Dict[str, float] | None = None
    impact_score: Dict[str, object] | None = None
    career_arc: Dict[str, object] | None = None
    jd_parsed: Dict[str, object] | None = None


class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str


class ResumeExperienceEntry(BaseModel):
    role_title: str = ""
    company: str = ""
    location: str = ""
    date_range: str = ""
    bullets: List[str] = Field(default_factory=list)


class ResumeProjectEntry(BaseModel):
    name: str = ""
    subtitle: str = ""
    bullets: List[str] = Field(default_factory=list)


class ResumeSection(BaseModel):
    title: str = ""
    items: List[str] = Field(default_factory=list)


class DownloadResume(BaseModel):
    full_name: str = ""
    headline: str = ""
    location: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    portfolio: str = ""
    summary: str = ""
    core_skills: List[str] = Field(default_factory=list)
    experience: List[ResumeExperienceEntry] = Field(default_factory=list)
    projects: List[ResumeProjectEntry] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    additional_sections: List[ResumeSection] = Field(default_factory=list)


class OptimizeResponse(BaseModel):
    optimized_resume: str
    key_changes: List[str] = Field(default_factory=list)
    ats_score_estimate: int
    download_resume: DownloadResume


class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str
    skill_gaps: List[str] = Field(default_factory=list)
    requested_count: int = 18
    exclude_questions: List[str] = Field(default_factory=list)


class InterviewQuestion(BaseModel):
    category: str  # "behavioral", "technical", "situational"
    question: str
    ideal_answer: str
    focus_area: Optional[str] = ""
    difficulty: Optional[str] = "medium"
    coaching_tip: Optional[str] = ""


class InterviewResponse(BaseModel):
    questions: List[InterviewQuestion] = Field(default_factory=list)


class RoadmapRequest(BaseModel):
    skill_gaps: List[str] = Field(default_factory=list)
    current_role: Optional[str] = ""
    target_role: Optional[str] = ""


class RoadmapWeek(BaseModel):
    week: str
    focus: str
    actions: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)


class StudyTopic(BaseModel):
    topic: str
    priority: str = "medium"
    why_it_matters: str = ""
    estimated_time: str = ""
    study_actions: List[str] = Field(default_factory=list)
    practice_task: str = ""
    google_link: str = ""
    youtube_link: str = ""


class RoadmapResponse(BaseModel):
    headline: str = ""
    study_plan: List[StudyTopic] = Field(default_factory=list)
    thirty_day_plan: List[RoadmapWeek] = Field(default_factory=list)
    sixty_day_plan: List[RoadmapWeek] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)

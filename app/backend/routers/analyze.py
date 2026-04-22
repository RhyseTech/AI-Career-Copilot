from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import AnalyzeResponse, SkillGap
from services.resume_parser import parse_resume
from services.jd_parser import parse_job_description
from services.match_engine import compute_match_score, find_matched_skills, find_missing_skills, rank_skill_gaps
from services.gap_engine import analyze_gaps
from services.groq_client import groq_chat
import re

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_profile(
    job_description: str = Form(...),
    resume_file: UploadFile = File(None),
    resume_text: str = Form(None),
):
    """
    Core analysis endpoint.
    Accepts a resume (PDF or text) + job description, returns full analysis.
    """
    # 1. Parse resume
    if resume_file and resume_file.filename:
        file_bytes = await resume_file.read()
        parsed_resume = parse_resume(file_bytes=file_bytes)
    elif resume_text:
        parsed_resume = parse_resume(text=resume_text)
    else:
        raise HTTPException(status_code=400, detail="Provide either a resume PDF or paste resume text.")

    resume_raw = parsed_resume["raw_text"]
    resume_skills = parsed_resume["skills"]
    resume_experience = parsed_resume["experience"]

    # 2. Parse JD
    jd_parsed = parse_job_description(job_description)
    jd_skills = jd_parsed.get("required_skills", []) + jd_parsed.get("tools", [])
    jd_seniority = jd_parsed.get("seniority_level", "mid")

    # 3. Match score
    match_score = compute_match_score(resume_raw, job_description)

    # 4. Skill matching
    matched = find_matched_skills(resume_skills, jd_skills)
    missing = find_missing_skills(resume_skills, jd_skills)
    ranked_gaps = rank_skill_gaps(missing, job_description)

    # 5. Gap engine
    gap_analysis = analyze_gaps(
        missing_skills=missing,
        jd_text=job_description,
        resume_text=resume_raw,
        target_role=jd_parsed.get("role_title", ""),
    )

    skill_gaps = [
        SkillGap(
            skill=g["skill"],
            priority=g.get("priority", "medium"),
            reason=g.get("reason", "Required by job description"),
        )
        for g in gap_analysis.get("skill_gaps", [])
    ]

    # 6. Summary via Groq
    summary_prompt = f"""In 2-3 sentences, summarize this candidate's fit for the role.
Resume skills: {', '.join(resume_skills[:10])}
JD required: {', '.join(jd_skills[:10])}
Match score: {match_score}%
Missing: {', '.join(missing[:5])}
Be direct, professional, and encouraging."""

    summary = groq_chat(
        "You are a professional career advisor. Be concise and direct.",
        summary_prompt,
        temperature=0.4,
    )

    return AnalyzeResponse(
        match_score=match_score,
        resume_text=resume_raw,
        parsed_skills=resume_skills,
        parsed_experience=resume_experience,
        jd_required_skills=jd_skills,
        jd_seniority=jd_seniority,
        skill_gaps=skill_gaps,
        matched_skills=matched,
        experience_gaps=gap_analysis.get("experience_gaps", []),
        summary=summary,
    )

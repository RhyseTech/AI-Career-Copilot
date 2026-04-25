from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.job_content import resolve_job_description
from services.resume_parser import parse_resume
from services.jd_parser import parse_job_description
from services.match_engine import compute_match_score, compute_sub_scores, find_matched_skills, find_missing_skills
from services.gap_engine import analyze_gaps
from services.ats_emulator import emulate_ats_score
from services.blind_spot_detector import detect_blind_spots
from services.confidence_scorer import compute_confidence_score
from services.groq_client import groq_chat

router = APIRouter()


@router.post("/analyze")
async def analyze_profile(
    job_description: str = Form(""),
    job_description_url: str = Form(""),
    job_description_file: UploadFile = File(None),
    resume_file: UploadFile = File(None),
    resume_text: str = Form(None),
):
    """
    Core analysis endpoint — the main pipeline.
    Accepts a resume (PDF/DOCX or text) + job description.
    Returns comprehensive career analysis with all engines.
    """
    # 1. Parse resume
    if resume_file and resume_file.filename:
        file_bytes = await resume_file.read()
        parsed_resume = parse_resume(file_bytes=file_bytes, filename=resume_file.filename)
    elif resume_text:
        parsed_resume = parse_resume(text=resume_text)
    else:
        raise HTTPException(status_code=400, detail="Provide either a resume PDF/DOCX or paste resume text.")

    resume_raw = parsed_resume["raw_text"]
    resume_skills = parsed_resume["skills"]
    resume_experience = parsed_resume["experience"]
    career_arc = parsed_resume["career_arc"]
    impact_data = parsed_resume["impact_score"]

    # 2. Resolve and parse JD
    try:
        jd_file_bytes = await job_description_file.read() if job_description_file and job_description_file.filename else None
        jd_text, jd_source, jd_source_label = resolve_job_description(
            text=job_description,
            file_bytes=jd_file_bytes,
            filename=job_description_file.filename if job_description_file else None,
            url=job_description_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    jd_parsed = parse_job_description(jd_text)
    jd_skills = jd_parsed.get("required_skills", []) + jd_parsed.get("tools", [])
    jd_seniority = jd_parsed.get("seniority_level", "mid")

    # 3. Match score + sub-scores
    match_score = compute_match_score(resume_raw, jd_text)
    sub_scores_data = compute_sub_scores(resume_raw, jd_text, resume_skills, jd_skills)

    # 4. Skill matching (ontology-aware)
    matched = find_matched_skills(resume_skills, jd_skills)
    missing = find_missing_skills(resume_skills, jd_skills)

    # 5. Gap engine
    gap_analysis = analyze_gaps(
        missing_skills=missing,
        jd_text=jd_text,
        resume_text=resume_raw,
        target_role=jd_parsed.get("role_title", ""),
    )

    skill_gaps = [
        {
            "skill": g["skill"],
            "priority": g.get("priority", "medium"),
            "reason": g.get("reason", "Required by job description"),
            "how_to_learn": g.get("how_to_learn", ""),
            "time_estimate": g.get("time_estimate", ""),
        }
        for g in gap_analysis.get("skill_gaps", [])
    ]

    # 6. ATS Emulation
    ats_result = emulate_ats_score(resume_raw, jd_skills)

    # 7. Blind Spot Detection
    blind_spots = detect_blind_spots(resume_raw, jd_text, jd_skills)

    # 8. Confidence Score
    confidence = compute_confidence_score(
        match_score=match_score,
        ats_score=ats_result["overall_score"],
        skill_gaps_count=len(skill_gaps),
        matched_skills_count=len(matched),
        total_jd_skills=len(jd_skills),
        impact_score=impact_data["score"],
    )

    # 9. Summary via Groq
    summary_prompt = f"""In 2-3 sentences, summarize this candidate's fit for the role.
Resume skills: {', '.join(resume_skills[:10])}
JD required: {', '.join(jd_skills[:10])}
Match score: {match_score}%
Missing: {', '.join(missing[:5])}
Be direct, professional, and encouraging."""

    try:
        summary = groq_chat(
            "You are a professional career advisor. Be concise and direct.",
            summary_prompt,
            temperature=0.4,
        )
    except Exception:
        summary = (
            f"Your profile shows a {round(match_score)}% match for the target role. "
            f"You already bring {len(matched)} relevant skills, but closing the top gaps in "
            f"{', '.join(missing[:3]) or 'the listed requirements'} will make your application much stronger."
        )

    return {
        "match_score": match_score,
        "sub_scores": sub_scores_data,
        "resume_text": resume_raw,
        "job_description_text": jd_text,
        "job_description_source": jd_source,
        "job_description_source_label": jd_source_label,
        "parsed_skills": resume_skills,
        "parsed_experience": resume_experience,
        "jd_required_skills": jd_skills,
        "jd_seniority": jd_seniority,
        "jd_parsed": jd_parsed,
        "skill_gaps": skill_gaps,
        "matched_skills": matched,
        "experience_gaps": gap_analysis.get("experience_gaps", []),
        "quick_wins": gap_analysis.get("quick_wins", []),
        "summary": summary,
        "career_arc": career_arc,
        "impact_score": impact_data,
        "ats_score": ats_result,
        "blind_spots": blind_spots,
        "confidence_score": confidence,
    }

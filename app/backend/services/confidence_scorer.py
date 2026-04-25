"""
Career Confidence Score — holistic 5-dimension scoring beyond just match %.
Dimensions: Resume Quality, Skill Readiness, Interview Preparedness,
Market Visibility, Compensation Knowledge.
"""


def compute_confidence_score(
    match_score: float,
    ats_score: float,
    skill_gaps_count: int,
    matched_skills_count: int,
    total_jd_skills: int,
    impact_score: float = 50,
    has_interview_prep: bool = False,
    has_salary_data: bool = False,
    has_linkedin_optimization: bool = False,
) -> dict:
    """
    Compute a 5-dimension Career Confidence Score.
    Each dimension is 0-100. Overall is weighted average.
    """
    # 1. Resume Quality — based on ATS score and impact metrics
    resume_quality = round(ats_score * 0.6 + impact_score * 0.4, 1)

    # 2. Skill Readiness — based on match score and gap ratio
    skill_ratio = matched_skills_count / max(total_jd_skills, 1)
    skill_readiness = round(match_score * 0.5 + skill_ratio * 100 * 0.5, 1)
    skill_readiness = min(skill_readiness, 100)

    # 3. Interview Preparedness — starts low, improves when user uses interview prep
    interview_prep = 75 if has_interview_prep else 20

    # 4. Market Visibility — LinkedIn optimization status
    market_visibility = 70 if has_linkedin_optimization else 15

    # 5. Compensation Knowledge — salary intelligence usage
    comp_knowledge = 65 if has_salary_data else 10

    dimensions = {
        "resume_quality": resume_quality,
        "skill_readiness": skill_readiness,
        "interview_preparedness": interview_prep,
        "market_visibility": market_visibility,
        "compensation_knowledge": comp_knowledge,
    }

    # Weighted overall (resume and skills weighted more heavily)
    overall = round(
        resume_quality * 0.30 +
        skill_readiness * 0.30 +
        interview_prep * 0.20 +
        market_visibility * 0.10 +
        comp_knowledge * 0.10,
        1
    )

    # Level label
    if overall >= 80:
        level = "Career Ready"
        level_desc = "You're well-positioned to compete strongly for this role."
    elif overall >= 60:
        level = "Getting There"
        level_desc = "Good foundation — a few targeted improvements will make you a strong contender."
    elif overall >= 40:
        level = "Needs Work"
        level_desc = "Several areas need attention before you'll be competitive for this role."
    else:
        level = "Early Stage"
        level_desc = "Significant gaps exist — use the roadmap and tools to build your profile."

    return {
        "overall_score": overall,
        "level": level,
        "level_description": level_desc,
        "dimensions": dimensions,
        "tips": _generate_tips(dimensions),
    }


def _generate_tips(dimensions: dict) -> list[str]:
    """Generate actionable tips based on lowest-scoring dimensions."""
    tips = []
    if dimensions["resume_quality"] < 60:
        tips.append("Optimize your resume using the Resume Optimizer tab to improve ATS compatibility and impact.")
    if dimensions["skill_readiness"] < 60:
        tips.append("Focus on closing your top skill gaps — check the Career Roadmap for a learning plan.")
    if dimensions["interview_preparedness"] < 50:
        tips.append("Run the Interview Prep module to practice role-specific questions and boost your confidence.")
    if dimensions["market_visibility"] < 50:
        tips.append("Optimize your LinkedIn profile to increase recruiter discoverability.")
    if dimensions["compensation_knowledge"] < 50:
        tips.append("Check Salary Intelligence to understand your market value and prepare for negotiation.")
    return tips

"""
ATS Emulator — rule-based scoring that simulates how an ATS system evaluates a resume.
Pure logic, no API cost.
"""
import re
from typing import List


def _detect_sections(text: str) -> dict[str, bool]:
    """Detect common resume sections."""
    text_lower = text.lower()
    sections = {
        "contact_info": bool(re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)),  # email
        "phone": bool(re.search(r'[\+]?[\d\s\-().]{10,}', text)),
        "summary": any(kw in text_lower for kw in ["summary", "objective", "profile", "about me"]),
        "experience": any(kw in text_lower for kw in ["experience", "work history", "employment", "professional experience"]),
        "education": any(kw in text_lower for kw in ["education", "academic", "degree", "university", "college"]),
        "skills": any(kw in text_lower for kw in ["skills", "technical skills", "core competencies", "competencies"]),
        "certifications": any(kw in text_lower for kw in ["certification", "certifications", "certified", "licenses"]),
        "projects": any(kw in text_lower for kw in ["projects", "portfolio", "key projects"]),
    }
    return sections


def _check_formatting(text: str) -> dict:
    """Check for ATS-unfriendly formatting issues."""
    lines = text.split('\n')
    issues = []
    warnings = []

    # Check for very short resume
    word_count = len(text.split())
    if word_count < 150:
        issues.append("Resume is too short — ATS systems flag resumes under 150 words")
    elif word_count < 300:
        warnings.append("Resume is relatively short — aim for 400-800 words for best ATS performance")

    # Check for action verbs
    strong_verbs = ["led", "managed", "developed", "implemented", "designed", "built", "created",
                    "increased", "reduced", "improved", "delivered", "launched", "optimized",
                    "architected", "established", "streamlined", "executed", "drove", "spearheaded"]
    text_lower = text.lower()
    verb_count = sum(1 for v in strong_verbs if v in text_lower)
    if verb_count < 3:
        issues.append("Too few action verbs — ATS and recruiters look for strong verbs like 'Led', 'Developed', 'Implemented'")

    # Check for quantified achievements
    metric_patterns = [r'\d+%', r'\$[\d,]+', r'₹[\d,]+', r'\d+\+?\s*(years|months|people|team|users|clients)']
    metric_count = sum(len(re.findall(p, text, re.IGNORECASE)) for p in metric_patterns)
    if metric_count < 2:
        warnings.append("Few quantified achievements — add metrics like '40% improvement' or 'managed 15-person team'")

    # Check for common ATS-breaking patterns
    if re.search(r'[│║═─┼┬┴┤├]', text):
        issues.append("Special box-drawing characters detected — these break most ATS parsers")
    if text.count('\t') > 10:
        warnings.append("Excessive tab characters — some ATS systems misparse tabbed layouts")

    return {"issues": issues, "warnings": warnings, "word_count": word_count, "action_verb_count": verb_count, "metric_count": metric_count}


def _keyword_alignment(resume_text: str, jd_skills: List[str]) -> dict:
    """Check how well resume keywords align with JD."""
    resume_lower = resume_text.lower()
    found = []
    missing = []
    for skill in jd_skills:
        if skill.lower() in resume_lower:
            found.append(skill)
        else:
            missing.append(skill)

    density = len(found) / max(len(jd_skills), 1) * 100
    return {
        "keywords_found": found,
        "keywords_missing": missing,
        "keyword_match_pct": round(density, 1),
    }


def emulate_ats_score(resume_text: str, jd_skills: List[str] = None) -> dict:
    """
    Run full ATS emulation on a resume.
    Returns per-category scores and an overall ATS compatibility score.
    """
    if jd_skills is None:
        jd_skills = []

    sections = _detect_sections(resume_text)
    formatting = _check_formatting(resume_text)
    keyword_data = _keyword_alignment(resume_text, jd_skills)

    # Score calculation
    section_score = sum([
        sections["contact_info"] * 15,
        sections["phone"] * 5,
        sections["summary"] * 10,
        sections["experience"] * 20,
        sections["education"] * 10,
        sections["skills"] * 15,
        sections["certifications"] * 5,
    ])
    section_score = min(section_score, 80)  # cap at 80

    # Formatting deductions
    format_penalty = len(formatting["issues"]) * 10 + len(formatting["warnings"]) * 3
    format_score = max(0, 100 - format_penalty)

    # Keyword score
    keyword_score = min(keyword_data["keyword_match_pct"], 100)

    # Impact score (action verbs + metrics)
    impact_score = min((formatting["action_verb_count"] * 8) + (formatting["metric_count"] * 12), 100)

    # Overall weighted score
    overall = round(
        section_score * 0.25 +
        format_score * 0.20 +
        keyword_score * 0.35 +
        impact_score * 0.20,
        1
    )
    overall = min(overall, 100)

    return {
        "overall_score": overall,
        "section_score": round(section_score, 1),
        "format_score": round(format_score, 1),
        "keyword_score": round(keyword_score, 1),
        "impact_score": round(impact_score, 1),
        "sections_detected": sections,
        "formatting": formatting,
        "keyword_alignment": keyword_data,
        "recommendations": formatting["issues"] + formatting["warnings"] + (
            [f"Missing keywords: {', '.join(keyword_data['keywords_missing'][:5])}"]
            if keyword_data["keywords_missing"] else []
        ),
    }

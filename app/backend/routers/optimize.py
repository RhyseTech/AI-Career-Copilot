from fastapi import APIRouter, HTTPException
from models.schemas import (
    DownloadResume,
    OptimizeRequest,
    OptimizeResponse,
    ResumeExperienceEntry,
    ResumeProjectEntry,
    ResumeSection,
)
from services.groq_client import groq_chat
from services.ats_emulator import emulate_ats_score
from services.resume_parser import extract_skills_from_text
import re
import json

router = APIRouter()

OPTIMIZE_SYSTEM = """You are an elite resume writer and ATS optimization expert with 20 years of experience.
Your rewrites are powerful, quantified, and keyword-rich.
You produce modern but ATS-safe resumes using clear single-column structure, conventional section names,
clean chronology, and scannable bullet points.
Always respond with valid JSON only."""

OPTIMIZE_USER_TEMPLATE = """Rewrite and optimize this resume to strongly match the job description.

Rules:
1. Use strong action verbs
2. Add quantified impact where possible based on existing evidence
3. Align keywords with the JD naturally
4. Keep ATS-friendly formatting and conventional section titles
5. Preserve authenticity and do not fabricate facts
6. Make work positions and chronology easy to scan
7. Produce a modern single-column resume structure suitable for PDF or text export

Respond in JSON:
{{
  "optimized_resume": "full rewritten resume text here",
  "key_changes": ["list of top 5 changes made and why"],
  "ats_score_estimate": 85,
  "download_resume": {{
    "full_name": "candidate name if available",
    "headline": "targeted resume headline",
    "location": "city/country if available",
    "email": "email if available",
    "phone": "phone if available",
    "linkedin": "linkedin url or handle if available",
    "portfolio": "portfolio or github if available",
    "summary": "2-4 line ATS-friendly professional summary",
    "core_skills": ["skill 1", "skill 2", "skill 3"],
    "experience": [
      {{
        "role_title": "job title",
        "company": "company",
        "location": "location if available",
        "date_range": "date range",
        "bullets": ["achievement bullet", "achievement bullet"]
      }}
    ],
    "projects": [
      {{
        "name": "project name",
        "subtitle": "tech stack or context",
        "bullets": ["project bullet", "project bullet"]
      }}
    ],
    "education": ["education line"],
    "certifications": ["certification line"],
    "additional_sections": [
      {{
        "title": "section title",
        "items": ["item 1", "item 2"]
      }}
    ]
  }}
}}

ORIGINAL RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""


def _extract_first_match(pattern: str, text: str) -> str:
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_section_block(text: str, section_names: list[str]) -> str:
    escaped = "|".join(re.escape(name) for name in section_names)
    pattern = rf"(?:^|\n)\s*(?:{escaped})\s*:?\s*\n(.*?)(?=\n\s*[A-Z][A-Z /&-]{{2,}}\s*:?\s*\n|\Z)"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _extract_bullets(block: str) -> list[str]:
    items = []
    for line in block.splitlines():
        cleaned = re.sub(r"^[\-\*\u2022\+]\s*", "", line).strip()
        if cleaned:
            items.append(cleaned)
    return items[:8]


def _normalize_ats_text(text: str) -> str:
    cleaned = text or ""
    replacements = {
        "•": "-",
        "►": "-",
        "▪": "-",
        "–": "-",
        "—": "-",
    }
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)
    # Remove ATS-unfriendly box drawing characters.
    cleaned = re.sub(r"[│║═─┼┬┴┤├]", " ", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _has_section(text: str, names: list[str]) -> bool:
    lowered = text.lower()
    return any(name.lower() in lowered for name in names)


def _append_section(text: str, title: str, lines: list[str]) -> str:
    section_lines = [line.strip() for line in lines if line and line.strip()]
    if not section_lines:
        return text
    suffix = "\n".join(section_lines)
    return f"{text.strip()}\n\n{title}\n{suffix}".strip()


def _enforce_max_ats_resume(resume_text: str, job_description: str) -> tuple[str, list[str], int]:
    optimized = _normalize_ats_text(resume_text)
    key_changes: list[str] = []

    jd_keywords = extract_skills_from_text(job_description)
    resume_keywords = {skill.lower() for skill in extract_skills_from_text(optimized)}
    missing_keywords = [skill for skill in jd_keywords if skill.lower() not in resume_keywords][:12]

    if missing_keywords:
        optimized = _append_section(
            optimized,
            "CORE SKILLS",
            [" | ".join(missing_keywords)],
        )
        key_changes.append("Added missing JD keywords to CORE SKILLS for stronger ATS matching.")

    if not _has_section(optimized, ["professional summary", "summary", "profile"]):
        optimized = _append_section(
            optimized,
            "PROFESSIONAL SUMMARY",
            ["Results-focused candidate aligned to the target role requirements and ATS keyword expectations."],
        )
        key_changes.append("Added PROFESSIONAL SUMMARY section for ATS completeness.")

    if not _has_section(optimized, ["experience", "professional experience", "work history"]):
        optimized = _append_section(
            optimized,
            "PROFESSIONAL EXPERIENCE",
            ["- Add role-specific achievements with measurable outcomes and action verbs."],
        )
        key_changes.append("Added PROFESSIONAL EXPERIENCE section heading for parser clarity.")

    if not _has_section(optimized, ["education"]):
        optimized = _append_section(
            optimized,
            "EDUCATION",
            ["- Add highest degree, institution, and graduation year."],
        )
        key_changes.append("Added EDUCATION section heading for ATS structure compatibility.")

    if not _has_section(optimized, ["skills", "core skills", "technical skills"]):
        optimized = _append_section(
            optimized,
            "CORE SKILLS",
            ["- Add role-relevant skills from the job description."],
        )
        key_changes.append("Added CORE SKILLS section heading for keyword indexing.")

    ats_score = int(round(emulate_ats_score(optimized, jd_keywords)["overall_score"]))
    return optimized, key_changes, ats_score


def _build_fallback_download_resume(source_text: str, optimized_resume: str, job_description: str) -> DownloadResume:
    text = optimized_resume or source_text
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    full_name = lines[0] if lines else "Candidate Name"
    headline = lines[1] if len(lines) > 1 and len(lines[1]) < 90 else _extract_first_match(r"(?i)(?:role|title|headline)\s*:\s*(.+)", text)
    summary_block = _extract_section_block(text, ["SUMMARY", "PROFESSIONAL SUMMARY", "PROFILE"])
    skills_block = _extract_section_block(text, ["CORE SKILLS", "SKILLS", "TECHNICAL SKILLS"])
    education_block = _extract_section_block(text, ["EDUCATION"])
    certification_block = _extract_section_block(text, ["CERTIFICATIONS", "CERTIFICATION"])
    project_block = _extract_section_block(text, ["PROJECTS", "KEY PROJECTS"])

    contact_line = "\n".join(lines[:5])

    return DownloadResume(
        full_name=full_name,
        headline=headline or _extract_first_match(r"(?i)([A-Za-z /&-]*(Engineer|Developer|Consultant|Manager|Analyst|Architect))", job_description),
        location=_extract_first_match(r"(?i)(?:location|address)\s*:\s*(.+)", contact_line),
        email=_extract_first_match(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", contact_line),
        phone=_extract_first_match(r"(\+?\d[\d\s\-\(\)]{7,}\d)", contact_line),
        linkedin=_extract_first_match(r"(linkedin\.com/[^\s]+)", contact_line),
        portfolio=_extract_first_match(r"((?:github\.com|gitlab\.com|portfolio|behance\.net|dribbble\.com)[^\s]*)", contact_line),
        summary=summary_block or (lines[2] if len(lines) > 2 and len(lines[2]) < 260 else ""),
        core_skills=[item.strip() for item in re.split(r",|\||\n", skills_block) if item.strip()][:14],
        experience=[],
        projects=[ResumeProjectEntry(name="Selected Projects", subtitle="", bullets=_extract_bullets(project_block))] if project_block else [],
        education=_extract_bullets(education_block) or ([education_block] if education_block else []),
        certifications=_extract_bullets(certification_block) or ([certification_block] if certification_block else []),
        additional_sections=[ResumeSection(title="Optimized Resume", items=[line for line in lines[2:18]])],
    )


def _coerce_download_resume(payload: dict, source_text: str, optimized_resume: str, job_description: str) -> DownloadResume:
    raw = payload.get("download_resume") or {}

    try:
        experience = [
            ResumeExperienceEntry(
                role_title=str(item.get("role_title", "")),
                company=str(item.get("company", "")),
                location=str(item.get("location", "")),
                date_range=str(item.get("date_range", "")),
                bullets=[str(bullet) for bullet in item.get("bullets", []) if str(bullet).strip()],
            )
            for item in raw.get("experience", [])
            if isinstance(item, dict)
        ]
        projects = [
            ResumeProjectEntry(
                name=str(item.get("name", "")),
                subtitle=str(item.get("subtitle", "")),
                bullets=[str(bullet) for bullet in item.get("bullets", []) if str(bullet).strip()],
            )
            for item in raw.get("projects", [])
            if isinstance(item, dict)
        ]
        additional_sections = [
            ResumeSection(
                title=str(item.get("title", "")),
                items=[str(section_item) for section_item in item.get("items", []) if str(section_item).strip()],
            )
            for item in raw.get("additional_sections", [])
            if isinstance(item, dict)
        ]

        download_resume = DownloadResume(
            full_name=str(raw.get("full_name", "")),
            headline=str(raw.get("headline", "")),
            location=str(raw.get("location", "")),
            email=str(raw.get("email", "")),
            phone=str(raw.get("phone", "")),
            linkedin=str(raw.get("linkedin", "")),
            portfolio=str(raw.get("portfolio", "")),
            summary=str(raw.get("summary", "")),
            core_skills=[str(skill) for skill in raw.get("core_skills", []) if str(skill).strip()],
            experience=experience,
            projects=projects,
            education=[str(item) for item in raw.get("education", []) if str(item).strip()],
            certifications=[str(item) for item in raw.get("certifications", []) if str(item).strip()],
            additional_sections=additional_sections,
        )

        if download_resume.full_name or download_resume.summary or download_resume.experience:
            return download_resume
    except Exception:
        pass

    return _build_fallback_download_resume(source_text, optimized_resume, job_description)


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_resume(request: OptimizeRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    prompt = OPTIMIZE_USER_TEMPLATE.format(
        resume_text=request.resume_text[:3000],
        job_description=request.job_description[:2000],
    )

    raw = groq_chat(OPTIMIZE_SYSTEM, prompt, temperature=0.35, max_tokens=1700)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
        optimized_resume = result.get("optimized_resume", request.resume_text)
        key_changes = result.get("key_changes", [])
        ats_score_estimate = int(result.get("ats_score_estimate", 80))

        jd_keywords = extract_skills_from_text(request.job_description)
        if request.max_ats_mode:
            optimized_resume, enforced_changes, ats_score_estimate = _enforce_max_ats_resume(
                optimized_resume,
                request.job_description,
            )
            key_changes = [*key_changes, *enforced_changes, "Applied Max ATS Mode strict formatting and keyword enforcement."]
        else:
            ats_score_estimate = int(round(emulate_ats_score(optimized_resume, jd_keywords)["overall_score"]))

        return OptimizeResponse(
            optimized_resume=optimized_resume,
            key_changes=key_changes,
            ats_score_estimate=ats_score_estimate,
            download_resume=_coerce_download_resume(result, request.resume_text, optimized_resume, request.job_description),
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        optimized_resume = raw or request.resume_text
        key_changes = ["Resume rewritten to align with job description keywords"]
        ats_score_estimate = 78
        if request.max_ats_mode:
            optimized_resume, enforced_changes, ats_score_estimate = _enforce_max_ats_resume(
                optimized_resume,
                request.job_description,
            )
            key_changes = [*key_changes, *enforced_changes, "Applied Max ATS Mode strict formatting and keyword enforcement."]
        else:
            jd_keywords = extract_skills_from_text(request.job_description)
            ats_score_estimate = int(round(emulate_ats_score(optimized_resume, jd_keywords)["overall_score"]))

        return OptimizeResponse(
            optimized_resume=optimized_resume,
            key_changes=key_changes,
            ats_score_estimate=ats_score_estimate,
            download_resume=_build_fallback_download_resume(request.resume_text, optimized_resume, request.job_description),
        )

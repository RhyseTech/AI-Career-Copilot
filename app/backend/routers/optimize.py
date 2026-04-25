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

    raw = groq_chat(OPTIMIZE_SYSTEM, prompt, temperature=0.35)
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw).strip()

    try:
        result = json.loads(raw)
        optimized_resume = result.get("optimized_resume", request.resume_text)
        return OptimizeResponse(
            optimized_resume=optimized_resume,
            key_changes=result.get("key_changes", []),
            ats_score_estimate=int(result.get("ats_score_estimate", 80)),
            download_resume=_coerce_download_resume(result, request.resume_text, optimized_resume, request.job_description),
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        optimized_resume = raw or request.resume_text
        return OptimizeResponse(
            optimized_resume=optimized_resume,
            key_changes=["Resume rewritten to align with job description keywords"],
            ats_score_estimate=78,
            download_resume=_build_fallback_download_resume(request.resume_text, optimized_resume, request.job_description),
        )

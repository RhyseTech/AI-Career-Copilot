import io
import pdfplumber
import re
from typing import List, Tuple, Optional


# Common skill tokens (SAP-first + general tech)
SKILL_KEYWORDS = {
    # SAP ecosystem
    "SAP", "S/4HANA", "SAP HANA", "SAP ECC", "SAP BW", "SAP BO", "SAP ABAP",
    "SAP Fiori", "SAP UI5", "SAP BASIS", "SAP MM", "SAP SD", "SAP FI", "SAP CO",
    "SAP HR", "SAP HCM", "SAP CRM", "SAP SCM", "SAP PP", "SAP WM", "SAP EWM",
    "SAP GRC", "SAP SRM", "SAP APO", "SuccessFactors", "Ariba", "Concur",
    # Cloud & DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "Jenkins", "GitHub Actions", "Ansible", "Helm",
    # Data & AI
    "Python", "SQL", "PySpark", "Spark", "Databricks", "Snowflake", "dbt",
    "Power BI", "Tableau", "Looker", "pandas", "NumPy", "scikit-learn",
    "TensorFlow", "PyTorch", "Machine Learning", "LLM", "RAG",
    # General tech
    "Java", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI",
    "REST API", "GraphQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "Microservices", "Agile", "Scrum", "JIRA", "Confluence",
    # Soft skills
    "Leadership", "Communication", "Project Management", "Stakeholder Management",
    "Problem Solving", "Team Collaboration",
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using pdfplumber."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_raw(text: str) -> str:
    """Pass-through for plain text resumes."""
    return text.strip()


def extract_skills_from_text(text: str) -> List[str]:
    """
    Rule-based skill extractor: scan for known keywords (case-insensitive).
    Returns deduplicated list sorted alphabetically.
    """
    found = set()
    text_lower = text.lower()
    for skill in SKILL_KEYWORDS:
        # Match whole words/phrases
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.add(skill)
    return sorted(list(found))


def extract_experience_bullets(text: str) -> List[str]:
    """
    Extract bullet-point style experience lines.
    Looks for lines starting with •, -, *, or numbered items.
    Returns up to 20 most meaningful bullets.
    """
    bullets = []
    lines = text.split('\n')
    for line in lines:
        stripped = line.strip()
        # Match common bullet patterns
        if re.match(r'^[•\-\*\+►▸▶]\s+.{20,}', stripped):
            bullets.append(stripped.lstrip('•-*+►▸▶ ').strip())
        elif re.match(r'^\d+[\.\)]\s+.{20,}', stripped):
            bullets.append(re.sub(r'^\d+[\.\)]\s+', '', stripped))
    
    return bullets[:20]


def parse_resume(file_bytes: Optional[bytes] = None, text: Optional[str] = None) -> dict:
    """
    Main resume parser. Accepts either PDF bytes or raw text.
    Returns structured dict with text, skills, and experience bullets.
    """
    if file_bytes:
        raw_text = extract_text_from_pdf(file_bytes)
    elif text:
        raw_text = extract_text_from_raw(text)
    else:
        raise ValueError("Provide either file_bytes or text")
    
    skills = extract_skills_from_text(raw_text)
    experience = extract_experience_bullets(raw_text)
    
    return {
        "raw_text": raw_text,
        "skills": skills,
        "experience": experience,
    }

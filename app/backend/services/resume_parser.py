import io
import pdfplumber
import re
from typing import List, Tuple, Optional


# Common skill tokens across enterprise, software, cloud, data, mobile, QA, and security roles.
SKILL_KEYWORDS = {
    # SAP ecosystem
    "SAP", "S/4HANA", "SAP HANA", "SAP ECC", "SAP BW", "SAP BO", "SAP ABAP",
    "SAP Fiori", "SAP UI5", "SAP BASIS", "SAP MM", "SAP SD", "SAP FI", "SAP CO",
    "SAP HR", "SAP HCM", "SAP CRM", "SAP SCM", "SAP PP", "SAP WM", "SAP EWM",
    "SAP GRC", "SAP SRM", "SAP APO", "SuccessFactors", "Ariba", "Concur",
    "SAP FICO", "SAP SAC", "SAP BTP", "SAP Integration Suite", "SAP SolMan",
    "RISE with SAP", "SAP Analytics Cloud",
    # Frontend & Mobile
    "HTML", "CSS", "Sass", "Tailwind CSS", "Bootstrap", "JavaScript", "TypeScript",
    "React", "Next.js", "Redux", "Zustand", "Vue.js", "Nuxt.js", "Angular", "Svelte",
    "React Native", "Flutter", "Dart", "Android", "Kotlin", "Jetpack Compose",
    "iOS", "Swift", "SwiftUI", "UIKit",
    # Backend & APIs
    "Java", "Spring", "Spring Boot", "Hibernate", "Node.js", "Express.js", "NestJS",
    "Python", "Django", "Flask", "FastAPI", "PHP", "Laravel", "C#", ".NET",
    "ASP.NET", "Go", "Golang", "Ruby", "Ruby on Rails", "REST API", "GraphQL",
    "gRPC", "Microservices", "Monolith", "Event-Driven Architecture",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "DynamoDB", "Cassandra",
    "Oracle", "SQL Server", "SQLite", "Elasticsearch", "Neo4j", "Firebase",
    # Cloud & DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "Jenkins", "GitHub Actions", "GitLab CI", "Ansible", "Helm", "CloudFormation",
    "Pulumi", "Linux", "Bash", "Shell Scripting", "Nginx", "Apache Kafka",
    "RabbitMQ", "Airflow", "Prometheus", "Grafana", "SRE",
    # Data & AI
    "PySpark", "Spark", "Databricks", "Snowflake", "dbt", "Power BI", "Tableau",
    "Looker", "pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch",
    "Machine Learning", "Deep Learning", "LLM", "RAG", "MLOps", "Computer Vision",
    "NLP", "Data Engineering", "Data Analytics", "Data Science", "ETL", "ELT",
    "Feature Engineering", "A/B Testing",
    # Testing & Quality
    "Testing", "Unit Testing", "Integration Testing", "Automation Testing", "QA",
    "Selenium", "Cypress", "Playwright", "Jest", "PyTest", "Postman", "JUnit",
    # Security & Enterprise
    "Cybersecurity", "Application Security", "Penetration Testing", "IAM", "Okta",
    "OAuth", "SAML", "SOC 2", "ISO 27001", "Salesforce", "ServiceNow",
    # Product delivery
    "Agile", "Scrum", "Kanban", "JIRA", "Confluence", "Git", "C++",
    # Soft skills
    "Leadership", "Communication", "Project Management", "Stakeholder Management",
    "Problem Solving", "Team Collaboration", "Change Management",
    "Strategic Planning", "Vendor Management", "Client Management",
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


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from DOCX bytes."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    except ImportError:
        raise ValueError("python-docx is not installed. Run: pip install python-docx")


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
        elif re.match(r'^\d+[\.\\)]\s+.{20,}', stripped):
            bullets.append(re.sub(r'^\d+[\\.\\)]\s+', '', stripped))

    return bullets[:20]


def detect_career_arc(text: str) -> dict:
    """
    Detect career progression patterns from dates and role titles.
    Returns career arc analysis: progression, stagnation, or non-linear.
    """
    # Extract year ranges (e.g., "2018 - 2022", "2019-Present")
    year_pattern = r'(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|19\d{2}|[Pp]resent|[Cc]urrent)'
    matches = re.findall(year_pattern, text)

    # Extract role-level keywords
    role_levels = {
        "intern": 1, "trainee": 1, "junior": 2, "associate": 2,
        "analyst": 3, "consultant": 3, "developer": 3, "engineer": 3,
        "senior": 4, "lead": 5, "principal": 5, "staff": 5,
        "manager": 6, "director": 7, "vp": 8, "vice president": 8,
        "head": 7, "chief": 9, "cto": 9, "ceo": 9, "cfo": 9,
    }

    text_lower = text.lower()
    detected_levels = []
    for role, level in role_levels.items():
        if re.search(r'\b' + re.escape(role) + r'\b', text_lower):
            detected_levels.append((role, level))

    # Determine arc
    years_span = 0
    if matches:
        start_years = [int(m[0]) for m in matches]
        end_years = [2026 if m[1].lower() in ('present', 'current') else int(m[1]) for m in matches]
        if start_years and end_years:
            years_span = max(end_years) - min(start_years)

    max_level = max([l for _, l in detected_levels], default=0)
    min_level = min([l for _, l in detected_levels], default=0)

    if max_level - min_level >= 3:
        arc_type = "strong_progression"
        arc_description = "Strong career progression detected — clear upward trajectory across roles."
    elif max_level - min_level >= 1:
        arc_type = "moderate_progression"
        arc_description = "Moderate career growth — some advancement visible."
    elif years_span > 8 and max_level == min_level:
        arc_type = "lateral_or_stagnation"
        arc_description = "Long tenure without clear advancement — consider highlighting leadership or scope increases."
    else:
        arc_type = "early_career"
        arc_description = "Early career or limited role history — focus on impact and skills."

    return {
        "arc_type": arc_type,
        "arc_description": arc_description,
        "years_of_experience": years_span,
        "role_levels_detected": [r for r, _ in detected_levels],
        "positions_count": len(matches),
    }


def compute_impact_score(text: str) -> dict:
    """
    Quantify how well the resume demonstrates measurable impact.
    Looks for metrics, percentages, dollar amounts, team sizes, etc.
    """
    metrics = {
        "percentages": len(re.findall(r'\d+%', text)),
        "dollar_amounts": len(re.findall(r'[\$₹€£]\s*[\d,]+', text)),
        "team_sizes": len(re.findall(r'\d+[\+]?\s*(?:people|team members|reports|engineers|developers)', text, re.I)),
        "time_savings": len(re.findall(r'(?:reduced|saved|cut)\s+.*?\d+', text, re.I)),
        "revenue_impact": len(re.findall(r'(?:revenue|sales|growth|profit)\s*.*?\d+', text, re.I)),
        "scale_indicators": len(re.findall(r'\d+[kKmMbB]\+?\s*(?:users|customers|transactions|records)', text, re.I)),
    }

    total_metrics = sum(metrics.values())

    # Score out of 100
    if total_metrics >= 10:
        score = 95
        assessment = "Excellent — resume is rich with quantified impact"
    elif total_metrics >= 6:
        score = 75
        assessment = "Good — solid use of metrics, but add more specific numbers"
    elif total_metrics >= 3:
        score = 50
        assessment = "Average — some metrics present, but most bullets lack quantification"
    elif total_metrics >= 1:
        score = 30
        assessment = "Below average — very few measurable achievements highlighted"
    else:
        score = 10
        assessment = "Weak — no quantified achievements found. Add percentages, dollar amounts, team sizes."

    return {
        "score": score,
        "assessment": assessment,
        "metrics_found": metrics,
        "total_metrics_count": total_metrics,
        "suggestions": _impact_suggestions(metrics),
    }


def _impact_suggestions(metrics: dict) -> List[str]:
    suggestions = []
    if metrics["percentages"] < 3:
        suggestions.append("Add more percentage-based achievements (e.g., 'Reduced processing time by 40%')")
    if metrics["dollar_amounts"] < 1:
        suggestions.append("Include revenue/cost impact numbers (e.g., 'Managed ₹2Cr budget')")
    if metrics["team_sizes"] < 1:
        suggestions.append("Mention team sizes you led or collaborated with")
    if metrics["time_savings"] < 1:
        suggestions.append("Highlight time savings or efficiency improvements")
    return suggestions


def parse_resume(
    file_bytes: Optional[bytes] = None,
    text: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """
    Main resume parser. Accepts PDF bytes, DOCX bytes, or raw text.
    Returns structured dict with text, skills, experience, career arc, and impact score.
    """
    if file_bytes:
        if filename and filename.lower().endswith('.docx'):
            raw_text = extract_text_from_docx(file_bytes)
        else:
            raw_text = extract_text_from_pdf(file_bytes)
    elif text:
        raw_text = extract_text_from_raw(text)
    else:
        raise ValueError("Provide either file_bytes or text")

    skills = extract_skills_from_text(raw_text)
    experience = extract_experience_bullets(raw_text)
    career_arc = detect_career_arc(raw_text)
    impact = compute_impact_score(raw_text)

    return {
        "raw_text": raw_text,
        "skills": skills,
        "experience": experience,
        "career_arc": career_arc,
        "impact_score": impact,
    }

"""
Skill Ontology — synonym and equivalence mapping for intelligent matching.
Maps equivalent skills, adjacent skills, and certification equivalences.
"""

# Canonical skill → list of synonyms/equivalents
SKILL_SYNONYMS: dict[str, list[str]] = {
    # SAP Modules
    "SAP FICO": ["SAP FI", "SAP CO", "SAP Financial Accounting", "SAP Controlling", "SAP Finance"],
    "SAP SD": ["SAP Sales and Distribution", "SAP Sales & Distribution"],
    "SAP MM": ["SAP Materials Management", "SAP Material Management"],
    "SAP HCM": ["SAP HR", "SAP Human Capital Management", "SuccessFactors HCM"],
    "SAP BW": ["SAP BI", "SAP Business Warehouse", "SAP BW/BI", "SAP BW/4HANA"],
    "SAP ABAP": ["ABAP", "ABAP/4", "SAP Programming"],
    "SAP S/4HANA": ["S4HANA", "S/4 HANA", "SAP S4", "SAP HANA", "SAP ERP"],
    "SAP Fiori": ["SAP UI5", "SAPUI5", "Fiori UX"],
    "SAP BASIS": ["SAP Basis Administration", "SAP NetWeaver"],
    "SAP PP": ["SAP Production Planning"],
    "SAP WM": ["SAP Warehouse Management", "SAP EWM", "SAP Extended Warehouse Management"],
    "SAP GRC": ["SAP Governance Risk Compliance"],
    "SAP CRM": ["SAP Customer Relationship Management"],
    "SAP SCM": ["SAP Supply Chain Management", "SAP APO"],
    "SuccessFactors": ["SAP SuccessFactors", "SF", "SAP SF"],
    "SAP Ariba": ["Ariba"],
    "SAP Concur": ["Concur"],
    "SAP SAC": ["SAP Analytics Cloud"],

    # Cloud & DevOps
    "AWS": ["Amazon Web Services", "Amazon AWS"],
    "Azure": ["Microsoft Azure", "MS Azure"],
    "GCP": ["Google Cloud Platform", "Google Cloud"],
    "Docker": ["Containerization", "Docker Containers"],
    "Kubernetes": ["K8s", "Container Orchestration"],
    "CI/CD": ["Continuous Integration", "Continuous Deployment", "DevOps Pipeline"],
    "Terraform": ["Infrastructure as Code", "IaC"],

    # Data & AI
    "Python": ["Python3", "Python Programming"],
    "SQL": ["Structured Query Language", "MySQL", "PostgreSQL", "T-SQL", "PL/SQL"],
    "Machine Learning": ["ML", "Deep Learning", "AI/ML"],
    "Power BI": ["PowerBI", "Microsoft Power BI"],
    "Tableau": ["Tableau Desktop", "Tableau Server"],
    "PySpark": ["Apache Spark", "Spark"],
    "Databricks": ["Azure Databricks"],
    "Snowflake": ["Snowflake Data Cloud"],
    "dbt": ["data build tool", "dbt Cloud", "dbt Core"],
    "Airflow": ["Apache Airflow"],
    "Kafka": ["Apache Kafka", "Confluent Kafka"],
    "LLM": ["Large Language Models", "Generative AI", "GenAI"],
    "RAG": ["Retrieval-Augmented Generation", "Retrieval Augmented Generation"],
    "MLOps": ["ML Ops", "Machine Learning Operations"],

    # General Tech
    "React": ["React.js", "ReactJS"],
    "Next.js": ["NextJS"],
    "Node.js": ["NodeJS", "Node"],
    "Express.js": ["Express", "ExpressJS"],
    "NestJS": ["Nest.js", "Nest"],
    "JavaScript": ["JS", "ECMAScript"],
    "TypeScript": ["TS"],
    "Java": ["Core Java", "Java SE"],
    "Spring Boot": ["Spring", "SpringBoot"],
    ".NET": ["Dotnet", ".NET Core", "ASP.NET", "ASP.NET Core"],
    "C#": ["C Sharp"],
    "Angular": ["AngularJS", "Angular 2+"],
    "Vue.js": ["Vue", "VueJS"],
    "Svelte": ["SvelteKit"],
    "Flutter": ["Dart", "Flutter SDK"],
    "React Native": ["ReactNative"],
    "Android": ["Android SDK", "Kotlin Android"],
    "iOS": ["Swift", "SwiftUI", "UIKit"],
    "FastAPI": ["Fast API"],
    "Django": ["Django REST Framework", "DRF"],
    "Flask": ["Flask API"],
    "GraphQL": ["Apollo GraphQL"],
    "REST API": ["RESTful API", "REST", "API Development"],
    "Microservices": ["Micro Services", "Microservice Architecture"],
    "PostgreSQL": ["Postgres"],
    "MongoDB": ["Mongo"],
    "Redis": ["Redis Cache"],
    "Elasticsearch": ["ElasticSearch", "ELK", "Elastic Stack"],
    "RabbitMQ": ["Rabbit MQ"],
    "Kubernetes": ["K8s", "Container Orchestration"],
    "Agile": ["Agile Methodology", "Scrum", "Kanban", "Agile/Scrum"],
    "CI/CD": ["Continuous Integration", "Continuous Delivery", "Continuous Deployment", "DevOps Pipeline"],
    "GitHub Actions": ["Github Actions"],
    "Terraform": ["Infrastructure as Code", "IaC"],
    "Jenkins": ["Jenkins CI"],
    "Ansible": ["Ansible Automation"],
    "Linux": ["Unix", "Bash", "Shell Scripting"],
    "Testing": ["Unit Testing", "Integration Testing", "Automation Testing", "QA"],
    "Playwright": ["Microsoft Playwright"],
    "Cypress": ["Cypress.io"],
    "Selenium": ["Selenium WebDriver"],
    "Jest": ["Jest Testing"],
    "PyTest": ["pytest"],
    "Cybersecurity": ["Application Security", "Security Engineering", "InfoSec"],
    "Penetration Testing": ["Pentesting", "Ethical Hacking"],

    # Soft Skills
    "Project Management": ["Program Management", "PM", "PMP"],
    "Stakeholder Management": ["Stakeholder Engagement", "Stakeholder Communication"],
    "Leadership": ["Team Leadership", "People Management", "Team Management"],
    "Communication": ["Verbal Communication", "Written Communication"],
    "Change Management": ["OCM", "Organizational Change Management"],
}

# Build reverse lookup: any synonym → canonical name
_REVERSE_MAP: dict[str, str] = {}
for canonical, synonyms in SKILL_SYNONYMS.items():
    _REVERSE_MAP[canonical.lower()] = canonical
    for syn in synonyms:
        _REVERSE_MAP[syn.lower()] = canonical


def normalize_skill(skill: str) -> str:
    """Map a skill to its canonical name. Returns original if not found."""
    return _REVERSE_MAP.get(skill.lower().strip(), skill)


def are_skills_equivalent(skill_a: str, skill_b: str) -> bool:
    """Check if two skills are equivalent via the ontology."""
    return normalize_skill(skill_a) == normalize_skill(skill_b)


def find_matches_with_ontology(
    resume_skills: list[str], jd_skills: list[str]
) -> tuple[list[str], list[str]]:
    """
    Find matched and missing skills using ontology-aware comparison.
    Returns (matched_skills, missing_skills).
    """
    resume_canonical = {normalize_skill(s): s for s in resume_skills}
    matched = []
    missing = []

    for jd_skill in jd_skills:
        jd_canon = normalize_skill(jd_skill)
        if jd_canon in resume_canonical:
            matched.append(jd_skill)
        else:
            missing.append(jd_skill)

    return matched, missing

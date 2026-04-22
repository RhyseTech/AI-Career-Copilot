from typing import List, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import numpy as np

# Load model once at module level (cached across requests)
_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def compute_match_score(resume_text: str, jd_text: str) -> float:
    """
    Compute semantic similarity between resume and job description.
    Returns a float between 0 and 100 (percentage).
    """
    model = get_model()
    embeddings = model.encode([resume_text[:2000], jd_text[:2000]])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    # Scale to 0-100 and clamp
    return round(float(np.clip(score * 100, 0, 100)), 1)


def find_matched_skills(resume_skills: List[str], jd_skills: List[str]) -> List[str]:
    """
    Find skills present in both resume and JD (case-insensitive).
    """
    resume_lower = {s.lower(): s for s in resume_skills}
    matched = []
    for skill in jd_skills:
        if skill.lower() in resume_lower:
            matched.append(skill)
    return matched


def find_missing_skills(resume_skills: List[str], jd_skills: List[str]) -> List[str]:
    """
    Find JD skills NOT present in the resume.
    """
    resume_lower = {s.lower() for s in resume_skills}
    missing = []
    for skill in jd_skills:
        if skill.lower() not in resume_lower:
            missing.append(skill)
    return missing


def rank_skill_gaps(missing_skills: List[str], jd_text: str) -> List[Tuple[str, str]]:
    """
    Rank missing skills by importance using mention frequency in JD.
    Returns list of (skill, priority) tuples: high/medium/low.
    """
    jd_lower = jd_text.lower()
    ranked = []
    for skill in missing_skills:
        count = jd_lower.count(skill.lower())
        if count >= 3:
            priority = "high"
        elif count == 2:
            priority = "medium"
        else:
            priority = "low"
        ranked.append((skill, priority))
    # Sort by priority
    order = {"high": 0, "medium": 1, "low": 2}
    ranked.sort(key=lambda x: order[x[1]])
    return ranked

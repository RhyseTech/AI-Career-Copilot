from typing import List, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from services.skill_ontology import find_matches_with_ontology, normalize_skill
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


def compute_sub_scores(resume_text: str, jd_text: str, resume_skills: List[str], jd_skills: List[str]) -> dict:
    """
    Compute explainable sub-scores across multiple dimensions.
    Returns a dict with per-category scores and justifications.
    """
    model = get_model()

    # Overall semantic score
    overall_emb = model.encode([resume_text[:2000], jd_text[:2000]])
    overall_sim = float(cosine_similarity([overall_emb[0]], [overall_emb[1]])[0][0]) * 100

    # Skills match ratio (ontology-aware)
    matched, missing = find_matches_with_ontology(resume_skills, jd_skills)
    skills_score = len(matched) / max(len(jd_skills), 1) * 100

    # Experience depth — based on how much the resume discusses role-relevant content
    exp_keywords = ["led", "managed", "developed", "implemented", "designed", "delivered",
                    "years", "experience", "responsible", "built", "created"]
    resume_lower = resume_text.lower()
    exp_count = sum(1 for kw in exp_keywords if kw in resume_lower)
    experience_score = min(exp_count * 10, 100)

    # Leadership signals
    leadership_keywords = ["led", "managed", "team", "director", "head", "vp", "chief",
                           "mentored", "coached", "supervised", "reports"]
    lead_count = sum(1 for kw in leadership_keywords if kw in resume_lower)
    leadership_score = min(lead_count * 12, 100)

    # Tools/technology alignment
    tool_matched = sum(1 for s in jd_skills if s.lower() in resume_lower)
    tools_score = tool_matched / max(len(jd_skills), 1) * 100

    sub_scores = {
        "overall_semantic": round(overall_sim, 1),
        "skills_match": round(skills_score, 1),
        "experience_depth": round(experience_score, 1),
        "leadership_signals": round(leadership_score, 1),
        "tools_alignment": round(min(tools_score, 100), 1),
    }

    # Generate justifications
    justifications = []
    if skills_score >= 70:
        justifications.append(f"Strong skill alignment — {len(matched)}/{len(jd_skills)} required skills found in your resume.")
    elif skills_score >= 40:
        justifications.append(f"Moderate skill match — {len(matched)}/{len(jd_skills)} skills align. {len(missing)} gaps to address.")
    else:
        justifications.append(f"Significant skill gaps — only {len(matched)}/{len(jd_skills)} required skills found.")

    if experience_score >= 60:
        justifications.append("Resume demonstrates strong experience depth with action-oriented language.")
    else:
        justifications.append("Consider adding more detail about your responsibilities and achievements.")

    if leadership_score >= 40:
        justifications.append("Leadership experience is evident in your profile.")
    elif leadership_score > 0:
        justifications.append("Some leadership signals present — consider expanding on team management experience.")

    return {
        "sub_scores": sub_scores,
        "justifications": justifications,
        "composite_score": round(
            overall_sim * 0.3 + skills_score * 0.35 + experience_score * 0.15 +
            leadership_score * 0.1 + tools_score * 0.1, 1
        ),
    }


def find_matched_skills(resume_skills: List[str], jd_skills: List[str]) -> List[str]:
    """
    Find skills present in both resume and JD (ontology-aware).
    """
    matched, _ = find_matches_with_ontology(resume_skills, jd_skills)
    return matched


def find_missing_skills(resume_skills: List[str], jd_skills: List[str]) -> List[str]:
    """
    Find JD skills NOT present in the resume (ontology-aware).
    """
    _, missing = find_matches_with_ontology(resume_skills, jd_skills)
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

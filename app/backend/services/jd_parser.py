import json
import re
from typing import List, Dict
from services.groq_client import groq_chat


JD_SYSTEM_PROMPT = """You are an expert job description analyst. 
Extract structured information from the job description provided.
Always respond with valid JSON only — no markdown, no explanations.
"""

JD_USER_TEMPLATE = """Analyze this job description and extract the following in JSON format:
{{
  "required_skills": ["list of required technical and soft skills"],
  "nice_to_have_skills": ["optional/preferred skills"],
  "tools": ["specific tools, platforms, software mentioned"],
  "seniority_level": "junior | mid | senior | lead | manager | director",
  "years_of_experience": "number or range as string",
  "role_title": "exact job title",
  "industry": "industry/domain",
  "key_responsibilities": ["top 5 responsibilities as short bullets"],
  "hidden_requirements": ["unstated but implied requirements based on context"]
}}

JOB DESCRIPTION:
{jd_text}
"""


def parse_job_description(jd_text: str) -> dict:
    """
    Use Groq/Llama3 to extract structured info from a job description.
    Falls back to empty defaults if parsing fails.
    """
    prompt = JD_USER_TEMPLATE.format(jd_text=jd_text[:4000])  # Trim for token limits
    
    raw = groq_chat(JD_SYSTEM_PROMPT, prompt, temperature=0.1)
    
    # Strip any markdown code fences if present
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()
    
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return empty structure
        parsed = {
            "required_skills": [],
            "nice_to_have_skills": [],
            "tools": [],
            "seniority_level": "mid",
            "years_of_experience": "not specified",
            "role_title": "Unknown Role",
            "industry": "General",
            "key_responsibilities": [],
            "hidden_requirements": [],
        }
    
    return parsed

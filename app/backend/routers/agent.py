from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header

from models.schemas import AgentAutoApplyRequest, AgentEmailDraftRequest, AgentOutreachRequest
from services.groq_client import groq_chat
from services.memory_store import get_user_by_token, log_agent_action

router = APIRouter()


def _token_from_header(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


def _resolve_user_id(authorization: Optional[str]) -> Optional[int]:
    token = _token_from_header(authorization)
    if not token:
        return None
    user = get_user_by_token(token)
    return user["id"] if user else None


@router.post("/agent/email-draft")
async def draft_application_email(
    request: AgentEmailDraftRequest,
    authorization: Optional[str] = Header(default=None),
):
    system_prompt = (
        "You are a senior career strategist and job application writer. "
        "Write concise, persuasive application emails. Return plain text only."
    )
    user_prompt = f"""
Draft a job application email.
Tone: {request.tone}
Recipient: {request.recipient_name or 'Hiring Team'}
Role: {request.role_title}
Company: {request.company_name}
Candidate summary: {request.candidate_summary}
Key points to include: {", ".join(request.key_points) if request.key_points else "N/A"}

Output structure:
1) Subject line
2) Email body (120-220 words)
3) 3 short follow-up subject line variants
"""

    fallback = (
        f"Subject: Application for {request.role_title or 'the role'} at {request.company_name or 'your company'}\n\n"
        f"Hi {request.recipient_name or 'Hiring Team'},\n\n"
        "I am excited to apply for this role and bring strong execution focus, communication, "
        "and problem-solving experience. I have reviewed the role needs and can contribute quickly "
        "by translating business goals into measurable outcomes.\n\n"
        f"My background: {request.candidate_summary or 'Hands-on delivery across technical and cross-functional initiatives.'}\n"
        "I would value the chance to discuss how I can help your team hit priority goals.\n\n"
        "Best regards,\nCandidate\n\n"
        "Follow-up subject variants:\n"
        "- Following up on my application\n"
        "- Interested in the role and next steps\n"
        "- Quick follow-up: application status"
    )

    try:
        content = groq_chat(system_prompt, user_prompt, temperature=0.35, max_tokens=650)
        status = "generated"
    except Exception:
        content = fallback
        status = "fallback"

    record = log_agent_action(
        action_type="email_draft",
        status=status,
        content={"draft": content},
        user_id=_resolve_user_id(authorization),
    )
    return {"status": status, "draft": content, "action": record}


@router.post("/agent/recruiter-outreach")
async def draft_recruiter_outreach(
    request: AgentOutreachRequest,
    authorization: Optional[str] = Header(default=None),
):
    system_prompt = (
        "You write warm, professional recruiter outreach messages. "
        "Keep it concise and specific. Return plain text only."
    )
    user_prompt = f"""
Write a recruiter outreach message.
Recipient name: {request.recipient_name or 'Recruiter'}
Recipient role: {request.recipient_role}
Company: {request.company_name}
Context: {request.context}
Candidate summary: {request.candidate_summary}
Ask: {request.ask}

Output:
1) LinkedIn DM version (under 450 characters)
2) Email version (under 170 words)
3) 2 follow-up lines
"""

    fallback = (
        f"LinkedIn DM:\nHi {request.recipient_name or 'there'}, I came across roles at {request.company_name or 'your company'} "
        "that match my background and would value connecting. "
        f"{request.ask}\n\n"
        "Email:\nHello,\nI am reaching out because I am interested in opportunities that align with my skills and experience. "
        f"{request.candidate_summary or 'I focus on delivering measurable outcomes and strong collaboration across teams.'} "
        f"{request.ask}\n\nThank you,\nCandidate\n\n"
        "Follow-ups:\n- Quick follow-up on my previous note\n- Happy to share role-specific portfolio details"
    )

    try:
        content = groq_chat(system_prompt, user_prompt, temperature=0.4, max_tokens=650)
        status = "generated"
    except Exception:
        content = fallback
        status = "fallback"

    record = log_agent_action(
        action_type="recruiter_outreach",
        status=status,
        content={"message": content},
        user_id=_resolve_user_id(authorization),
    )
    return {"status": status, "outreach": content, "action": record}


@router.post("/agent/auto-apply-plan")
async def build_auto_apply_plan(
    request: AgentAutoApplyRequest,
    authorization: Optional[str] = Header(default=None),
):
    today = datetime.now(timezone.utc).date().isoformat()
    system_prompt = (
        "You are a career execution agent. Create practical, safe job-application plans. "
        "Do not claim you submitted applications. Return concise JSON only."
    )
    user_prompt = f"""
Create a dry-run auto-apply execution plan for this candidate.
Date: {today}
Role: {request.role_title}
Company: {request.company_name}
Resume summary: {request.resume_summary}
Job description: {request.job_description[:1500]}
Constraints: {", ".join(request.constraints) if request.constraints else "None"}

Return JSON:
{{
  "goal": "...",
  "steps": ["..."],
  "artifacts_to_prepare": ["..."],
  "risk_checks": ["..."],
  "ready_to_send_checklist": ["..."]
}}
"""

    default_plan = {
        "goal": f"Prepare a complete and high-quality application package for {request.role_title or 'the target role'}.",
        "steps": [
            "Customize resume bullets for this role and company language.",
            "Generate application email and recruiter outreach draft.",
            "Prepare 3 talking points tied to measurable outcomes.",
            "Validate ATS keywords and application form readiness.",
            "Perform final review before manual submission.",
        ],
        "artifacts_to_prepare": [
            "Role-specific resume (PDF + text)",
            "Application email draft",
            "Recruiter outreach message",
            "Interview-ready project impact bullets",
        ],
        "risk_checks": [
            "No false claims or fabricated experience",
            "Keyword alignment without keyword stuffing",
            "Contact details and links verified",
        ],
        "ready_to_send_checklist": [
            "Resume tailored to role",
            "Email draft reviewed",
            "Outreach message personalized",
            "Portfolio/GitHub links active",
        ],
    }

    try:
        import json
        import re

        raw = groq_chat(system_prompt, user_prompt, temperature=0.3, max_tokens=800)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw).strip()
        plan = json.loads(raw)
        if not isinstance(plan, dict):
            plan = default_plan
        status = "generated"
    except Exception:
        plan = default_plan
        status = "fallback"

    record = log_agent_action(
        action_type="auto_apply_plan",
        status=status,
        content={"plan": plan},
        user_id=_resolve_user_id(authorization),
    )
    return {"status": status, "plan": plan, "action": record, "dry_run": True}

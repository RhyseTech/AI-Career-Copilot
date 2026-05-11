from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from models.schemas import (
    AuthResponse,
    LoginRequest,
    ProgressTrackRequest,
    RegisterRequest,
    SaveSessionRequest,
    UserProfile,
)
from services.memory_store import (
    authenticate_user,
    create_token,
    create_user,
    get_progress_summary,
    get_user_by_token,
    list_sessions,
    save_session,
    track_progress,
)

router = APIRouter()


def _get_token_from_auth_header(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    prefix = "bearer "
    if not authorization.lower().startswith(prefix):
        raise HTTPException(status_code=401, detail="Authorization must be a Bearer token.")
    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token is missing.")
    return token


def _require_user(authorization: Optional[str]) -> dict:
    token = _get_token_from_auth_header(authorization)
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user


@router.post("/memory/register", response_model=AuthResponse)
async def register_account(request: RegisterRequest):
    try:
        user = create_user(request.email, request.password, request.full_name or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = create_token(user["id"])
    return AuthResponse(token=token, user=UserProfile(**user))


@router.post("/memory/login", response_model=AuthResponse)
async def login_account(request: LoginRequest):
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_token(user["id"])
    return AuthResponse(token=token, user=UserProfile(**user))


@router.get("/memory/me", response_model=UserProfile)
async def memory_me(authorization: Optional[str] = Header(default=None)):
    user = _require_user(authorization)
    return UserProfile(**user)


@router.post("/memory/sessions")
async def create_memory_session(
    request: SaveSessionRequest,
    authorization: Optional[str] = Header(default=None),
):
    user = _require_user(authorization)
    session = save_session(
        user_id=user["id"],
        title=request.title or "",
        analysis_result=request.analysis_result,
        job_description=request.job_description or "",
    )
    return {"session": session}


@router.get("/memory/sessions")
async def get_memory_sessions(
    limit: int = 20,
    authorization: Optional[str] = Header(default=None),
):
    user = _require_user(authorization)
    sessions = list_sessions(user_id=user["id"], limit=limit)
    return {"sessions": sessions}


@router.post("/memory/progress")
async def post_progress(
    request: ProgressTrackRequest,
    authorization: Optional[str] = Header(default=None),
):
    user = _require_user(authorization)
    try:
        event = track_progress(
            user_id=user["id"],
            event_type=request.event_type,
            details=request.details,
            score=request.score,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"event": event}


@router.get("/memory/progress")
async def get_progress(authorization: Optional[str] = Header(default=None)):
    user = _require_user(authorization)
    return get_progress_summary(user["id"])

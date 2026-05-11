import hashlib
import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "career_copilot.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_memory_store() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                role_title TEXT NOT NULL DEFAULT '',
                match_score REAL NOT NULL DEFAULT 0,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS progress_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                score REAL,
                details_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS agent_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action_type TEXT NOT NULL,
                status TEXT NOT NULL,
                content_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_user(email: str, password: str, full_name: str = "") -> Dict[str, Any]:
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise ValueError("Email is required.")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    created_at = _utc_now()
    password_hash = _hash_password(password)

    with _connect() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO users (email, full_name, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (normalized_email, full_name.strip(), password_hash, created_at),
            )
        except sqlite3.IntegrityError as exc:
            raise ValueError("Account already exists for this email.") from exc

        user_id = cursor.lastrowid
        conn.commit()

    return {
        "id": user_id,
        "email": normalized_email,
        "full_name": full_name.strip(),
        "created_at": created_at,
    }


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    normalized_email = email.strip().lower()
    password_hash = _hash_password(password)
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, email, full_name, created_at
            FROM users
            WHERE email = ? AND password_hash = ?
            """,
            (normalized_email, password_hash),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO auth_tokens (token, user_id, created_at)
            VALUES (?, ?, ?)
            """,
            (token, user_id, _utc_now()),
        )
        conn.commit()
    return token


def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.email, u.full_name, u.created_at
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = ?
            """,
            (token,),
        ).fetchone()
    return dict(row) if row else None


def save_session(user_id: int, title: str, analysis_result: Dict[str, Any], job_description: str = "") -> Dict[str, Any]:
    role_title = ((analysis_result.get("jd_parsed") or {}).get("role_title") or "").strip()
    match_score = float(analysis_result.get("match_score") or 0)
    payload = {
        "analysis_result": analysis_result,
        "job_description": job_description,
    }
    created_at = _utc_now()
    with _connect() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (user_id, title, role_title, match_score, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                title.strip() or role_title or "Career analysis",
                role_title,
                match_score,
                json.dumps(payload),
                created_at,
            ),
        )
        session_id = cursor.lastrowid
        conn.commit()

    return {
        "id": session_id,
        "title": title.strip() or role_title or "Career analysis",
        "role_title": role_title,
        "match_score": match_score,
        "created_at": created_at,
        "payload": payload,
    }


def list_sessions(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    bounded_limit = max(1, min(limit, 100))
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, title, role_title, match_score, payload_json, created_at
            FROM sessions
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, bounded_limit),
        ).fetchall()

    sessions: List[Dict[str, Any]] = []
    for row in rows:
        payload = {}
        try:
            payload = json.loads(row["payload_json"])
        except json.JSONDecodeError:
            payload = {}
        sessions.append(
            {
                "id": row["id"],
                "title": row["title"],
                "role_title": row["role_title"],
                "match_score": row["match_score"],
                "created_at": row["created_at"],
                "payload": payload,
            }
        )
    return sessions


def track_progress(user_id: int, event_type: str, details: Optional[Dict[str, Any]] = None, score: Optional[float] = None) -> Dict[str, Any]:
    created_at = _utc_now()
    clean_type = event_type.strip().lower()
    if not clean_type:
        raise ValueError("event_type is required.")

    with _connect() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO progress_events (user_id, event_type, score, details_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                clean_type,
                score,
                json.dumps(details or {}),
                created_at,
            ),
        )
        event_id = cursor.lastrowid
        conn.commit()

    return {
        "id": event_id,
        "event_type": clean_type,
        "score": score,
        "details": details or {},
        "created_at": created_at,
    }


def get_progress_summary(user_id: int) -> Dict[str, Any]:
    with _connect() as conn:
        counts = conn.execute(
            """
            SELECT event_type, COUNT(*) AS total
            FROM progress_events
            WHERE user_id = ?
            GROUP BY event_type
            """,
            (user_id,),
        ).fetchall()
        latest_events = conn.execute(
            """
            SELECT event_type, score, details_json, created_at
            FROM progress_events
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 10
            """,
            (user_id,),
        ).fetchall()
        avg_score_row = conn.execute(
            """
            SELECT AVG(score) AS average_score
            FROM progress_events
            WHERE user_id = ? AND score IS NOT NULL
            """,
            (user_id,),
        ).fetchone()

    event_counts = {row["event_type"]: row["total"] for row in counts}
    events = []
    for row in latest_events:
        try:
            details = json.loads(row["details_json"] or "{}")
        except json.JSONDecodeError:
            details = {}
        events.append(
            {
                "event_type": row["event_type"],
                "score": row["score"],
                "details": details,
                "created_at": row["created_at"],
            }
        )

    return {
        "event_counts": event_counts,
        "average_score": avg_score_row["average_score"] if avg_score_row else None,
        "recent_events": events,
    }


def log_agent_action(
    action_type: str,
    status: str,
    content: Dict[str, Any],
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    created_at = _utc_now()
    with _connect() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO agent_actions (user_id, action_type, status, content_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                action_type.strip().lower(),
                status.strip().lower(),
                json.dumps(content),
                created_at,
            ),
        )
        action_id = cursor.lastrowid
        conn.commit()

    return {
        "id": action_id,
        "user_id": user_id,
        "action_type": action_type.strip().lower(),
        "status": status.strip().lower(),
        "content": content,
        "created_at": created_at,
    }

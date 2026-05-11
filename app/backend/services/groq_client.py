import os
import time
from groq import Groq, BadRequestError, RateLimitError
from dotenv import load_dotenv

load_dotenv()

_client = None
DEFAULT_MODEL = "llama-3.1-8b-instant"
DEFAULT_MAX_TOKENS = 900

# Backward-compatible aliases for older model names that have been removed.
DEPRECATED_MODEL_MAP = {
    "llama3-8b-8192": "llama-3.1-8b-instant",
    "llama3-70b-8192": "llama-3.1-70b-versatile",
}


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not set. Please add it to your .env file.\n"
                "Get a free key at: https://console.groq.com"
            )
        _client = Groq(api_key=api_key)
    return _client


def _coerce_max_tokens(value: int | str | None) -> int:
    try:
        parsed = int(value) if value is not None else DEFAULT_MAX_TOKENS
    except (TypeError, ValueError):
        parsed = DEFAULT_MAX_TOKENS
    return max(200, min(parsed, 4096))


def groq_chat(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int | None = None,
) -> str:
    """Call Groq chat model and return the assistant text response."""
    client = get_groq_client()
    raw_model = os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip()
    preferred_model = DEPRECATED_MODEL_MAP.get(raw_model, raw_model) or DEFAULT_MODEL
    fallback_models = [preferred_model, DEFAULT_MODEL]
    configured_default = _coerce_max_tokens(os.getenv("GROQ_MAX_TOKENS", DEFAULT_MAX_TOKENS))
    requested_max = _coerce_max_tokens(max_tokens if max_tokens is not None else configured_default)
    token_budgets = list(dict.fromkeys([requested_max, max(256, requested_max // 2)]))

    # Preserve order while removing duplicates.
    ordered_models = list(dict.fromkeys(fallback_models))
    last_error: Exception | None = None

    for model in ordered_models:
        for max_tokens in token_budgets:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content.strip()
            except BadRequestError as exc:
                # Retry only when model is rejected/decommissioned.
                code = ""
                try:
                    code = str((exc.body or {}).get("error", {}).get("code", "")).lower()
                except Exception:
                    code = ""
                if code not in {"model_decommissioned", "invalid_model", "model_not_found"}:
                    raise
                last_error = exc
                # Try next model immediately.
                break
            except RateLimitError as exc:
                last_error = exc
                # Small backoff and then retry with lower token budget.
                time.sleep(2)
                continue

    if last_error:
        raise last_error
    raise RuntimeError("Unable to complete Groq chat request.")

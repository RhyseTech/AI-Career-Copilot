import re
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

from services.resume_parser import (
    extract_text_from_docx,
    extract_text_from_pdf,
    extract_text_from_raw,
)


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class VisibleTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._ignored_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript", "svg", "head"}:
            self._ignored_stack.append(tag)
            return
        if tag in {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "h5", "br"}:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._ignored_stack and self._ignored_stack[-1] == tag:
            self._ignored_stack.pop()
            return
        if tag in {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "h5"}:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._ignored_stack:
            return
        cleaned = data.strip()
        if cleaned:
            self._chunks.append(cleaned)

    def get_text(self) -> str:
        text = " ".join(self._chunks)
        text = unescape(text)
        text = re.sub(r"\n\s+", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        return text.strip()


def _normalize_text(text: str) -> str:
    cleaned = extract_text_from_raw(text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _extract_text_from_html(html: str) -> str:
    parser = VisibleTextExtractor()
    parser.feed(html)
    parser.close()
    return _normalize_text(parser.get_text())


def extract_text_from_job_file(file_bytes: bytes, filename: str) -> str:
    lowered = (filename or "").lower()
    if lowered.endswith(".pdf"):
        return _normalize_text(extract_text_from_pdf(file_bytes))
    if lowered.endswith(".docx"):
        return _normalize_text(extract_text_from_docx(file_bytes))
    if lowered.endswith(".txt") or lowered.endswith(".md"):
        return _normalize_text(file_bytes.decode("utf-8", errors="ignore"))
    raise ValueError("Supported job description files are PDF, DOCX, TXT, or Markdown.")


def extract_text_from_job_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Please enter a valid LinkedIn or careers page URL.")

    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(follow_redirects=True, headers=headers, timeout=20.0) as client:
        response = client.get(url)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "").lower()
    if "application/pdf" in content_type or parsed.path.lower().endswith(".pdf"):
        extracted = extract_text_from_pdf(response.content)
    else:
        extracted = _extract_text_from_html(response.text)

    if len(extracted) < 180:
        raise ValueError(
            "We could not extract enough job details from that link. "
            "Please try the PDF upload or paste the JD text."
        )

    return extracted


def resolve_job_description(
    text: str | None = None,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    url: str | None = None,
) -> tuple[str, str, str]:
    if text and text.strip():
        return _normalize_text(text), "text", "Pasted job description"

    if file_bytes and filename:
        return extract_text_from_job_file(file_bytes, filename), "file", filename

    if url and url.strip():
        parsed = urlparse(url.strip())
        label = parsed.netloc.replace("www.", "") or "Job link"
        return extract_text_from_job_url(url.strip()), "url", label

    raise ValueError("Provide a job description as text, a file, or a job link.")

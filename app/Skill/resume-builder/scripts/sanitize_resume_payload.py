#!/usr/bin/env python3
"""
Sanitize resume payload JSON for deterministic template rendering.

Usage:
  python sanitize_resume_payload.py --input payload.json --output cleaned.json
  python sanitize_resume_payload.py < payload.json
"""

import argparse
import json
import re
import sys
from typing import Any


def clean_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = re.sub(r"[*_`#]", "", value)
    text = re.sub(r"[{}\[\]]", " ", text)
    text = re.sub(r'^(?:"?optimized_?resume"?|"?summary"?|"?experience"?|"?projects"?)\s*:\s*', "", text, flags=re.I)
    text = re.sub(r'^\s*["\']+|["\']+\s*$', "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def sanitize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    cleaned = {}
    for key, value in payload.items():
        if isinstance(value, list):
            out = []
            for item in value:
                if isinstance(item, str):
                    txt = clean_text(item)
                    if txt:
                        out.append(txt)
                elif isinstance(item, dict):
                    out.append(sanitize_payload(item))
            cleaned[key] = out
        elif isinstance(value, dict):
            cleaned[key] = sanitize_payload(value)
        elif isinstance(value, str):
            cleaned[key] = clean_text(value)
        else:
            cleaned[key] = value
    return cleaned


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="Input JSON file")
    parser.add_argument("--output", help="Output JSON file")
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    if not isinstance(data, dict):
        raise SystemExit("Expected top-level JSON object")

    cleaned = sanitize_payload(data)
    text = json.dumps(cleaned, indent=2, ensure_ascii=True)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


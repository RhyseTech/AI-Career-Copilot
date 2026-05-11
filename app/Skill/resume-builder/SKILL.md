---
name: resume-builder
description: Build or repair ATS resume outputs so they match a strict visual reference template (layout, section order, spacing, typography, alignment, and line wrapping). Use when a user asks to clone a resume format from an image/PDF, fix messy PDF layout overlap, or enforce consistent classic/balanced resume rendering from structured resume data.
---

# Resume Builder

## Overview

Use this skill to produce reference-faithful resume layouts, especially for PDF export pipelines.
Prioritize structural fidelity over creative variation.

## Workflow

1. Capture target format requirements from user artifacts (image or PDF).
2. Normalize resume data before rendering (remove model artifacts, fill missing sections).
3. Render with fixed template geometry and deterministic spacing.
4. Validate against the checklist and iterate until visual parity.

## Template Rules

Follow these non-negotiable rules:

1. Keep section order fixed:
`Summary -> Experience -> Education` on left and `Certifications -> Key Achievements -> Skills -> Projects` on right for classic two-column mode.
2. Use deterministic line wrapping and vertical increments based on rendered line count.
3. Reserve spacing after every multi-line block before drawing the next block.
4. Avoid emoji or non-ASCII symbols in generated PDF text.
5. Avoid placeholders in final output (`Your Name`, `Candidate Name`, `Add ... here`) unless user data is truly unavailable.
6. Reject malformed fields (example: `{`, markdown headers, JSON keys) and sanitize before rendering.
7. Keep visual rhythm consistent: title baseline, section separator lines, bullet indents, and column gutters must not drift between runs.

## Data Normalization

Before rendering, normalize payload fields:

1. Strip markdown and JSON-like noise from strings.
2. Recover `full_name`, `headline`, `summary`, `skills`, `experience`, and `projects` from fallback text when missing.
3. Reject address/phone-like strings as candidate names.
4. Cap section lengths for one-page layouts while preserving high-value bullets first.
5. Keep cleaned values ASCII-safe for predictable PDF rendering.

Use [references/data-normalization.md](references/data-normalization.md) for exact rules.

## Rendering Profile Selection

Use this routing:

1. Use `classic` when user asks for the two-column ATS format shown in the reference screenshot.
2. Use `balanced` only when explicitly requested and keep the same text hygiene + spacing safeguards.
3. If user asks to "match exactly", treat geometry and spacing as fixed constraints and do not redesign.

Use [references/classic-template-spec.md](references/classic-template-spec.md) for geometry and spacing targets.
Use [references/render-qa-checklist.md](references/render-qa-checklist.md) after every meaningful renderer change.

## Common User Requests

Handle requests like:

1. "Make this resume PDF look exactly like my sample."
2. "Fix overlap and spacing in classic template."
3. "Clone this structure with my data."
4. "Keep same pattern and export ATS-safe PDF."

When asked for exact clone quality:

1. Confirm section sequence and header placement first.
2. Lock columns and spacing.
3. Validate no line overlaps in each section block.
4. Validate no placeholder leakage.
5. Generate output and compare visually.

## References

Read these as needed:

1. [references/classic-template-spec.md](references/classic-template-spec.md)
2. [references/data-normalization.md](references/data-normalization.md)
3. [references/render-qa-checklist.md](references/render-qa-checklist.md)

Use visual targets from `assets/reference/` when available.

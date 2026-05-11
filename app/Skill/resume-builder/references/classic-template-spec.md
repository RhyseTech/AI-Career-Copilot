# Classic Template Spec

Use this as the canonical reference for the two-column ATS layout.

## Page Geometry

1. Page size: A4
2. Outer horizontal margin: `40pt`
3. Top margin: `45pt`
4. Bottom safe line: `pageHeight - 38pt`
5. Content width: `pageWidth - 80pt`

## Columns

1. Left column width: `56%` of content width
2. Column gap: `34pt`
3. Right column width: remaining width

## Header Block

1. Full name: uppercase, bold, large size (30-33 pt depending on length)
2. Headline: bold accent blue under name
3. Contact line: small, plain text; wrap max 2 lines
4. Avatar: blue circle, top-right

## Section Order

Left column:
1. Summary
2. Experience
3. Education

Right column:
1. Certifications
2. Key Achievements
3. Skills
4. Projects

## Typography

1. Body text: `#334155`
2. Heading text: `#0f172a`
3. Accent text: `#1d4ed8`
4. Muted text: `#64748b`
5. No emoji or non-ASCII bullet symbols in PDF text

## Spacing Rules

1. Every wrapped text block must advance Y by `line_count * line_height`
2. After section titles, add fixed vertical gap before content
3. Draw section divider lines with stable thickness (`0.7`)
4. After bullet groups, add breathing space before next block

## Overflow Policy

1. Cap lines per field when necessary
2. Never overlap text blocks
3. Drop low-priority trailing bullets if near bottom boundary


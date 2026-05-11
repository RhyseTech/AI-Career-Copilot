# Render QA Checklist

Run this checklist after any renderer or spacing change.

## Visual Fidelity

1. Name/header/blue avatar placement matches reference
2. Column widths and gap are stable
3. Section order matches template
4. Divider lines align to section blocks

## Spacing Integrity

1. No overlap in summary block
2. No overlap in certifications/achievements/projects
3. Bullet text wraps cleanly and increments Y correctly
4. No section starts inside previous section body

## Text Quality

1. No JSON fragments (`{`, `summary:`) in output
2. No markdown artifacts (`**`, `_`)
3. No placeholder labels leaked to final PDF
4. Contact fields are plain readable text

## ATS Safety

1. Clear section headers
2. Readable bullets and consistent chronology
3. No decorative glyph dependence

## Regression Check

1. Export classic with short content
2. Export classic with long content
3. Export balanced with same data
4. Compare both outputs for structure consistency


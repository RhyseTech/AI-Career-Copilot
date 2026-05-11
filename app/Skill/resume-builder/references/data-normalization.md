# Data Normalization Rules

Normalize all incoming fields before rendering.

## String Cleanup

1. Remove markdown markers: `*`, `_`, `` ` ``, `#`
2. Remove JSON-like wrappers: `{}`, `[]`, quoted key prefixes like `summary:`
3. Collapse repeated whitespace
4. Trim quotes and punctuation noise

## Placeholder Rejection

Reject as final name values:

1. `Your Name`
2. `Candidate Name`
3. `First Name Last Name`
4. Address-like values (`123 Main St`)
5. Phone-like values (`617-555-1234`)

## Fallback Recovery Priority

1. Structured `download_resume` fields
2. Parsed sections from `optimized_resume`
3. Parsed source resume text
4. Conservative defaults

## Minimum Viable Content Guarantees

Always provide:

1. `full_name`
2. `headline`
3. `summary`
4. At least one experience entry
5. At least one project entry
6. Skills list

If missing, synthesize neutral ATS-safe defaults from available analysis context.


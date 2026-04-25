# AI Career Copilot

## Product Vision
AI Career Copilot is an end-to-end career execution product, not just a resume tool. It helps candidates understand role fit, identify missing signals, improve their materials, prepare for interviews, benchmark compensation, optimize LinkedIn presence, and see their profile through a recruiter lens.

The product must work across all major technology stacks:
- SAP and enterprise systems
- Frontend engineering
- Backend engineering
- Full-stack engineering
- Mobile engineering
- Cloud and DevOps
- Data engineering and analytics
- AI and machine learning
- QA and test automation
- Cybersecurity
- Product and technical leadership roles

## Core User Problem
Candidates usually have to stitch together many disconnected tools:
- resume scanner
- ATS checker
- interview prep app
- salary site
- LinkedIn rewrite tool
- recruiter advice

AI Career Copilot unifies these into one flow driven by the user resume and a target job description.

## Primary Flow
1. User uploads a resume in PDF or DOCX, or pastes resume text.
2. User pastes a target job description.
3. System analyzes candidate fit and returns a multi-engine dashboard.
4. User explores optimization, interview prep, salary, LinkedIn, and recruiter insights from the same session.

## Product Modules

### 1. Resume and JD Analysis
- parse resume text
- extract skills across all tech stacks
- detect experience bullets
- estimate career progression
- calculate quantified impact score
- parse job description into skills, tools, seniority, role title, industry
- compute match score with semantic similarity
- compute explainable sub-scores

### 2. Skill Gap Intelligence
- detect missing skills
- rank them by priority
- explain why each gap matters
- suggest learning direction and quick wins
- surface experience gaps, not just missing keywords

### 3. ATS Intelligence
- emulate ATS scoring
- show section, keyword, formatting, and impact scores
- expose blind spots that reduce callback odds

### 4. Resume Optimizer
- rewrite the resume for the target role
- inject missing phrasing where relevant
- improve achievement language
- estimate post-optimization ATS performance

### 5. Interview Intelligence
- generate a larger interview bank, not just a few sample prompts
- include behavioral, technical, situational, and architecture questions
- support all major tech stacks
- include ideal answers and coaching tips
- personalize around user gaps and likely interviewer focus areas

### 6. Career Roadmap
- 30-day plan
- 60-day plan
- suggested certifications
- suggested projects

### 7. Salary Intelligence
- market salary range
- compensation breakdown
- negotiation scripts
- market insight for the role

### 8. LinkedIn Optimizer
- optimized headline
- optimized about section
- skills to add
- skills to deprioritize or remove
- recruiter discoverability improvements

### 9. Recruiter Signal Intelligence
- likely recruiter verdict
- first-impression summary
- skip reasons
- shortlist fixes
- interview likelihood estimate

## UX Requirements
- single primary dashboard after analysis
- lazy-load heavy AI modules when their tab is opened
- keep the experience fast and actionable
- show quick wins immediately
- avoid SAP-only wording in the interface
- support resume upload plus paste-text fallback

## Current Implementation Goals
- broaden skill extraction and ontology support for multi-stack roles
- increase interview question count and depth
- surface all product modules inside the dashboard
- keep standalone module pages available where helpful

## Success Metrics
- higher ATS score after optimization
- more matched skills against target JD
- more complete interview prep coverage
- clearer next steps within 60 days
- better recruiter-readiness and LinkedIn positioning

# AI Career Copilot

> **Not a resume builder.** An autonomous AI career execution system that analyzes, detects, optimizes, and launches your career in under 5 minutes.

Built by **RhyseTech**. Powered by Groq (Llama 3.1) + sentence-transformers.

---

## Quick Start

### 1. Backend Setup
```bash
cd app/backend

# Create virtual environment
python -m venv env

# Activate (Windows PowerShell)
.\env\Scripts\Activate.ps1

# Activate (Linux/Mac)
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Copy env and add your Groq API key
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd app/frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Architecture

```text
app/
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- models/
|   |   `-- schemas.py
|   |-- routers/
|   |   |-- analyze.py
|   |   |-- optimize.py
|   |   |-- interview.py
|   |   |-- roadmap.py
|   |   |-- ats.py
|   |   |-- salary.py
|   |   |-- linkedin.py
|   |   |-- recruiter.py
|   |   |-- memory.py          # NEW: accounts, sessions, progress
|   |   `-- agent.py           # NEW: auto-apply planning, drafts, outreach
|   |-- services/
|   |   |-- memory_store.py    # NEW: sqlite-backed persistence
|   |   `-- ...existing services
|   `-- data/
|       `-- .gitignore         # ignores sqlite db files
|-- frontend/
|   |-- app/
|   |   |-- page.tsx
|   |   |-- analyze/page.tsx
|   |   |-- dashboard/page.tsx
|   |   |-- auth/page.tsx      # NEW: login/register + memory summary
|   |   `-- agent/page.tsx     # NEW: agent workspace
|   `-- package.json
`-- README.md
```

---

## Tech Stack

| Layer | Tech | Cost |
|---|---|---|
| Backend | FastAPI + Python | Free |
| AI / LLM | Groq API (Llama 3.1 8B Instant) | Free tier |
| Matching | sentence-transformers (`all-MiniLM-L6-v2`) | Free |
| Resume Parsing | pdfplumber + python-docx + regex | Free |
| NLP | spaCy (`en_core_web_sm`) | Free |
| Frontend | Next.js 16 (App Router) | Free |
| Data Store | SQLite (local file) | Free |

---

## Features

### Core Analysis
- Resume parsing (PDF, DOCX, text)
- JD parsing and role-fit matching
- Skill gap detection and quick wins
- ATS scoring and blind spot detection
- Confidence and impact scoring

### Optimization and Prep
- Resume optimization (`/api/optimize`)
- Interview question generation (`/api/interview`)
- 30/60-day roadmap (`/api/roadmap`)

### Intelligence Layer
- Salary intelligence (`/api/salary`)
- LinkedIn optimization (`/api/linkedin-optimize`)
- Recruiter signal simulation (`/api/recruiter-signal`)

### Memory Layer (Implemented)
- User registration and login
- Session persistence for analysis results
- Progress event tracking and summary

### Agent Layer (Implemented)
- Auto-apply **planning** (dry run)
- Application email drafting
- Recruiter outreach drafting

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/analyze` | Full career analysis |
| POST | `/api/optimize` | Resume optimization |
| POST | `/api/interview` | Interview questions |
| POST | `/api/roadmap` | Study roadmap |
| POST | `/api/ats-score` | ATS score |
| POST | `/api/salary` | Salary intelligence |
| POST | `/api/linkedin-optimize` | LinkedIn optimization |
| POST | `/api/recruiter-signal` | Recruiter signal |
| POST | `/api/memory/register` | Register account |
| POST | `/api/memory/login` | Login account |
| GET | `/api/memory/me` | Current user |
| POST | `/api/memory/sessions` | Save analysis session |
| GET | `/api/memory/sessions` | List saved sessions |
| POST | `/api/memory/progress` | Track progress event |
| GET | `/api/memory/progress` | Progress summary |
| POST | `/api/agent/auto-apply-plan` | Build dry-run apply plan |
| POST | `/api/agent/email-draft` | Draft application email |
| POST | `/api/agent/recruiter-outreach` | Draft recruiter outreach |

Interactive docs: **http://localhost:8000/docs**

---

## Environment Variables

### Backend (`app/backend/.env`)
```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=900
FRONTEND_URL=http://localhost:3000
```

### Frontend (`app/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Roadmap Status

| Phase | Status | Features |
|---|---|---|
| P0 - MVP | Done | Resume parser, JD analyzer, match engine, gap engine |
| P1 - Intelligence | Done | ATS, blind spots, confidence, salary, LinkedIn, recruiter |
| P2 - Optimization | Done | Resume optimizer, interview prep, roadmap |
| P3 - Memory | **Implemented** | Accounts, session persistence, progress tracking |
| P4 - Agent | **Implemented** | Auto-apply planning, email drafting, recruiter outreach |

---

## License

Built by RhyseTech. All rights reserved.

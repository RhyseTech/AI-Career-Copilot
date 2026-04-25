# AI Career Copilot ⚡

> **Not a resume builder.** An autonomous AI career execution system that analyzes, detects, optimizes, and launches your career — in under 5 minutes.

Built by **RhyseTech** · Powered by Groq (Llama 3.1) + sentence-transformers · SAP-first, extensible to all domains

---

## 🚀 Quick Start

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

# Copy env and add your Groq API key (free at console.groq.com)
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

Open **http://localhost:3000** 🎉

---

## 🏗️ Architecture

```
app/
├── backend/
│   ├── main.py                    # FastAPI entry point (v2.0)
│   ├── .env                       # API keys (GROQ_API_KEY, GROQ_MODEL)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── analyze.py             # POST /api/analyze — full pipeline
│   │   ├── optimize.py            # POST /api/optimize — resume rewriter
│   │   ├── interview.py           # POST /api/interview — Q&A generator
│   │   ├── roadmap.py             # POST /api/roadmap — 30/60-day plan
│   │   ├── ats.py                 # POST /api/ats-score — ATS emulator
│   │   ├── salary.py              # POST /api/salary — salary intelligence
│   │   ├── linkedin.py            # POST /api/linkedin-optimize
│   │   └── recruiter.py           # POST /api/recruiter-signal
│   ├── services/
│   │   ├── resume_parser.py       # PDF/DOCX/text → structured data
│   │   ├── jd_parser.py           # JD → skills, seniority, requirements
│   │   ├── match_engine.py        # Semantic + ontology-aware matching
│   │   ├── gap_engine.py          # Skill gap analysis + learning paths
│   │   ├── groq_client.py         # Groq API wrapper
│   │   ├── skill_ontology.py      # Skill synonym/equivalence mapping
│   │   ├── ats_emulator.py        # Rule-based ATS scoring (free)
│   │   ├── blind_spot_detector.py # What's MISSING from your resume
│   │   ├── confidence_scorer.py   # 5-dimension career confidence
│   │   ├── salary_engine.py       # Salary benchmarks + negotiation
│   │   ├── linkedin_optimizer.py  # LinkedIn profile rewriter
│   │   └── recruiter_signal.py    # Recruiter perspective simulator
│   └── models/
│       └── schemas.py             # Pydantic request/response models
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   ├── layout.tsx             # Root layout + SEO
│   │   ├── globals.css            # Design system
│   │   ├── analyze/page.tsx       # Resume + JD input page
│   │   └── dashboard/page.tsx     # Results dashboard (5 tabs)
│   └── package.json
├── test data/
│   └── Fake-Resume.pdf
├── Ai_Career_Copilot.md           # Full PRD
└── README.md
```

---

## 🧠 Tech Stack

| Layer | Tech | Cost |
|-------|------|------|
| **Backend** | FastAPI + Python | Free |
| **AI / LLM** | Groq API (Llama 3.1 8B Instant) | Free tier |
| **Matching** | sentence-transformers (`all-MiniLM-L6-v2`) | Free |
| **Resume Parsing** | pdfplumber + python-docx + regex | Free |
| **NLP** | spaCy (`en_core_web_sm`) | Free |
| **Frontend** | Next.js 16 (App Router) | Free |
| **Design** | Vanilla CSS (dark glassmorphism) | Free |

**Total infrastructure cost: $0** — All tools are open-source or free tier.

---

## ✅ Features — Phase 1+2 MVP (Complete)

### Core Analysis Pipeline (`/api/analyze`)
- ✅ **Resume Intelligence** — PDF, DOCX, and text parsing with skill extraction
- ✅ **Career Arc Detection** — progression/stagnation analysis from role history
- ✅ **Impact Quantification** — scores how well you demonstrate measurable results
- ✅ **JD Analysis** — LLM-powered extraction of skills, seniority, hidden requirements
- ✅ **Semantic Match Engine** — vector similarity + ontology-aware skill matching
- ✅ **Explainable Sub-Scores** — skills, experience, leadership, tools breakdown
- ✅ **Skill Gap Detection** — ranked by priority with learning paths
- ✅ **Blind Spot Detector** — what's MISSING from your resume (unique differentiator)
- ✅ **ATS Emulator** — rule-based scoring (sections, formatting, keywords, impact)
- ✅ **Career Confidence Score** — 5-dimension holistic scoring

### Optimization & Preparation
- ✅ **Resume Optimizer** (`/api/optimize`) — AI rewrite with ATS alignment
- ✅ **Interview Intelligence** (`/api/interview`) — 10 personalized questions with ideal answers
- ✅ **Career Roadmap** (`/api/roadmap`) — 30/60-day action plans with certifications

### Phase 2 — Intelligence Layer
- ✅ **Salary Intelligence** (`/api/salary`) — benchmarks, negotiation scripts, comp breakdown
- ✅ **LinkedIn Optimizer** (`/api/linkedin-optimize`) — headline, about, skills rewrite
- ✅ **Recruiter Signal Intelligence** (`/api/recruiter-signal`) — skip reasons, pile position, fixes

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + endpoint list |
| `POST` | `/api/analyze` | Full career analysis pipeline |
| `POST` | `/api/optimize` | AI resume optimization |
| `POST` | `/api/interview` | Interview question generation |
| `POST` | `/api/roadmap` | Career roadmap generation |
| `POST` | `/api/ats-score` | ATS compatibility scoring |
| `POST` | `/api/salary` | Salary intelligence |
| `POST` | `/api/linkedin-optimize` | LinkedIn profile optimization |
| `POST` | `/api/recruiter-signal` | Recruiter signal analysis |

Interactive API docs: **http://localhost:8000/docs**

---

## ⚙️ Environment Variables

### Backend (`app/backend/.env`)
```
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
FRONTEND_URL=http://localhost:3000
```

### Frontend (`app/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Get a free Groq API key at: https://console.groq.com

---

## 🗺️ Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| **P0 — MVP** | ✅ Done | Resume parser, JD analyzer, match engine, gap engine |
| **P1 — Intelligence** | ✅ Done | ATS emulator, blind spots, confidence score, salary, LinkedIn, recruiter |
| **P2 — Optimization** | ✅ Done | Resume optimizer, interview prep, career roadmap |
| **P3 — Memory** | 🔮 Future | User accounts, session persistence, progress tracking |
| **P4 — Agent** | 🔮 Future | Auto-apply, email drafting, recruiter outreach |

---

## 📄 License

Built by RhyseTech. All rights reserved.

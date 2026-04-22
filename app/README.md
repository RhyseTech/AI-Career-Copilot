# AI Career Copilot 🚀

> An autonomous AI career optimization system — not a resume builder.

## Quick Start

### 1. Backend Setup
```bash
cd app/backend

# Copy env and add your Groq API key (free at console.groq.com)
cp .env.example .env

# Create virtual environment
python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.tx

# Download spaCy model
python -m spacy download en_core_web_sm

# Start server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd app/frontend

# Install deps
npm install

# Start dev server
npm run dev
```

Open **http://localhost:3000** 🎉

---

## Stack
| Layer | Tech |
|-------|------|
| **Backend** | FastAPI + Python |
| **AI / LLM** | Groq API (Llama 3 8B) |
| **Matching** | sentence-transformers (`all-MiniLM-L6-v2`) |
| **Resume Parsing** | pdfplumber + regex |
| **Frontend** | Next.js 14 (App Router) |
| **Design** | Vanilla CSS (dark glassmorphism) |

## Features (Phase 1 + 2 MVP)
- ✅ Resume parsing (PDF upload or text paste)
- ✅ Job description AI analysis
- ✅ Semantic match score (0–100%)
- ✅ Ranked skill gap detection
- ✅ AI resume optimizer (ATS-aligned rewrites)
- ✅ Personalized interview questions (behavioral + technical)
- ✅ 30/60-day career roadmap with certifications & projects

## Environment Variables

### Backend (`app/backend/.env`)
```
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama3-8b-8192
FRONTEND_URL=http://localhost:3000
```

### Frontend (`app/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

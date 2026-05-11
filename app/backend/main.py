from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

load_dotenv()

from routers import analyze, optimize, interview, roadmap, ats, salary, linkedin, recruiter, memory, agent
from services.memory_store import init_memory_store

app = FastAPI(
    title="AI Career Copilot API",
    description="Autonomous career optimization system — not a resume builder. "
                "Powered by Groq/Llama3 + sentence-transformers.",
    version="2.0.0",
)

# CORS — allow frontend dev server
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Routers (Phase 1 — MVP)
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(optimize.router, prefix="/api", tags=["Optimization"])
app.include_router(interview.router, prefix="/api", tags=["Interview"])
app.include_router(roadmap.router, prefix="/api", tags=["Roadmap"])
app.include_router(ats.router, prefix="/api", tags=["ATS Emulator"])

# Intelligence Routers (Phase 2)
app.include_router(salary.router, prefix="/api", tags=["Salary Intelligence"])
app.include_router(linkedin.router, prefix="/api", tags=["LinkedIn Optimizer"])
app.include_router(recruiter.router, prefix="/api", tags=["Recruiter Signal"])
app.include_router(memory.router, prefix="/api", tags=["Memory"])
app.include_router(agent.router, prefix="/api", tags=["Agent"])


@app.on_event("startup")
async def on_startup():
    init_memory_store()


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "AI Career Copilot API is running",
        "version": "2.0.0",
        "endpoints": [
            "/api/analyze", "/api/optimize", "/api/interview", "/api/roadmap",
            "/api/ats-score", "/api/salary", "/api/linkedin-optimize", "/api/recruiter-signal",
            "/api/memory/register", "/api/memory/login", "/api/memory/sessions", "/api/memory/progress",
            "/api/agent/email-draft", "/api/agent/recruiter-outreach", "/api/agent/auto-apply-plan",
        ],
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

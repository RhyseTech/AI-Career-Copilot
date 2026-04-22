from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

load_dotenv()

from routers import analyze, optimize, interview, roadmap

app = FastAPI(
    title="AI Career Copilot API",
    description="Autonomous career optimization system powered by Groq/Llama3",
    version="1.0.0",
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

# Routers
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(optimize.router, prefix="/api", tags=["Optimization"])
app.include_router(interview.router, prefix="/api", tags=["Interview"])
app.include_router(roadmap.router, prefix="/api", tags=["Roadmap"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "AI Career Copilot API is running"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

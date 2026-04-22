"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AnalyzePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [inputMode, setInputMode] = useState<"file" | "text">("file");
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState<"idle" | "parsing" | "matching" | "analyzing" | "done">("idle");

    const LOADING_STEPS = [
        { key: "parsing", label: "Parsing your resume...", icon: "📄" },
        { key: "matching", label: "Running semantic match engine...", icon: "🧠" },
        { key: "analyzing", label: "Detecting skill gaps...", icon: "🔍" },
        { key: "done", label: "Building your report...", icon: "✨" },
    ];

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") {
            setResumeFile(file);
            setError("");
        } else {
            setError("Please upload a PDF file.");
        }
    }, []);

    const handleSubmit = async () => {
        if (!jobDescription.trim()) { setError("Please paste a job description."); return; }
        if (inputMode === "file" && !resumeFile) { setError("Please upload your resume."); return; }
        if (inputMode === "text" && !resumeText.trim()) { setError("Please paste your resume text."); return; }

        setLoading(true);
        setError("");

        // Simulate progressive steps for UX
        const steps: Array<"parsing" | "matching" | "analyzing" | "done"> = ["parsing", "matching", "analyzing", "done"];
        let stepIdx = 0;
        const stepTimer = setInterval(() => {
            if (stepIdx < steps.length) { setStep(steps[stepIdx++]); }
            else clearInterval(stepTimer);
        }, 900);

        try {
            const formData = new FormData();
            formData.append("job_description", jobDescription);
            if (inputMode === "file" && resumeFile) {
                formData.append("resume_file", resumeFile);
            } else {
                formData.append("resume_text", resumeText);
            }

            const res = await fetch(`${API}/api/analyze`, { method: "POST", body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Analysis failed. Please try again.");
            }
            const data = await res.json();

            clearInterval(stepTimer);
            // Store results in sessionStorage and navigate to dashboard
            sessionStorage.setItem("analysisResult", JSON.stringify(data));
            sessionStorage.setItem("jobDescription", jobDescription);
            router.push("/dashboard");
        } catch (e: any) {
            clearInterval(stepTimer);
            setStep("idle");
            setError(e.message || "Something went wrong. Is the backend running?");
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
            <div className="orb orb-1" style={{ top: "-200px", right: "-100px" }} />
            <div className="orb orb-2" style={{ bottom: "5%", left: "-100px" }} />

            {/* Nav */}
            <nav className="nav-blur" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 32px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 60, gap: 16 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
                        <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, color: "var(--text-primary)" }}>Career<span className="gradient-text">Copilot</span></span>
                    </Link>
                </div>
            </nav>

            <div style={{ paddingTop: 100, paddingBottom: 80, maxWidth: 960, margin: "0 auto", padding: "100px 24px 80px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 48 }} className="animate-fade-in-up">
                    <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 12 }}>
                        Analyze Your <span className="gradient-text">Career Fit</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
                        Upload your resume + paste the job description. Let AI do the rest.
                    </p>
                </div>

                {/* Form Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="animate-fade-in-up delay-100">
                    {/* Left — Resume Input */}
                    <div className="glass-card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: "1.3rem" }}>📄</span>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Your Resume</h2>
                        </div>

                        {/* Toggle */}
                        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, border: "1px solid var(--border-subtle)" }}>
                            {(["file", "text"] as const).map(mode => (
                                <button key={mode} onClick={() => setInputMode(mode)}
                                    style={{
                                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem", transition: "all 0.25s",
                                        background: inputMode === mode ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
                                        color: inputMode === mode ? "#fff" : "var(--text-secondary)",
                                    }}>
                                    {mode === "file" ? "📎 Upload PDF" : "✏️ Paste Text"}
                                </button>
                            ))}
                        </div>

                        {inputMode === "file" ? (
                            <div
                                className={`drop-zone ${isDragging ? "active" : ""}`}
                                style={{ padding: "40px 24px", textAlign: "center", minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { setResumeFile(f); setError(""); } }} />
                                {resumeFile ? (
                                    <>
                                        <div style={{ fontSize: "2.5rem" }}>✅</div>
                                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--accent-green)" }}>{resumeFile.name}</div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{(resumeFile.size / 1024).toFixed(0)} KB · Click to change</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: "2.5rem" }}>☁️</div>
                                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Drop PDF here or click to browse</div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Supported: PDF · Max 10MB</div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <textarea
                                className="input-glass"
                                placeholder="Paste your resume text here..."
                                value={resumeText}
                                onChange={e => setResumeText(e.target.value)}
                                style={{ minHeight: 220, resize: "vertical", lineHeight: 1.6, fontSize: "0.85rem" }}
                            />
                        )}
                    </div>

                    {/* Right — JD Input */}
                    <div className="glass-card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: "1.3rem" }}>📋</span>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Job Description</h2>
                        </div>
                        <textarea
                            className="input-glass"
                            placeholder="Paste the full job description here — from LinkedIn, Indeed, or any company careers page..."
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                            style={{ flex: 1, minHeight: 280, resize: "vertical", lineHeight: 1.65, fontSize: "0.85rem" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", alignSelf: "center" }}>
                                {jobDescription.length} characters
                            </span>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "0.9rem" }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Loading progress */}
                {loading && (
                    <div className="glass-card animate-fade-in" style={{ marginTop: 24, padding: "28px 32px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {LOADING_STEPS.map((s, i) => {
                                const stepOrder = ["parsing", "matching", "analyzing", "done"];
                                const currentIdx = stepOrder.indexOf(step);
                                const thisIdx = stepOrder.indexOf(s.key);
                                const isActive = s.key === step;
                                const isDone = thisIdx < currentIdx;
                                return (
                                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 14, opacity: thisIdx <= currentIdx ? 1 : 0.3, transition: "opacity 0.4s" }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10, fontSize: "1.1rem",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: isDone ? "rgba(16,185,129,0.15)" : isActive ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                                            border: isDone ? "1px solid rgba(16,185,129,0.4)" : isActive ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border-subtle)",
                                            flexShrink: 0
                                        }}>
                                            {isDone ? "✅" : isActive ? <div className="spinner" /> : s.icon}
                                        </div>
                                        <div style={{ color: isActive ? "var(--text-primary)" : isDone ? "var(--accent-green)" : "var(--text-muted)", fontWeight: isActive ? 600 : 400, fontSize: "0.9rem" }}>
                                            {s.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CTA */}
                {!loading && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }} className="animate-fade-in-up delay-200">
                        <button className="btn-primary" onClick={handleSubmit}
                            style={{ padding: "18px 56px", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 10 }}>
                            <span>⚡</span> Analyze My Career Fit
                        </button>
                    </div>
                )}

                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Your data is processed in-memory and never stored permanently.
                </p>
            </div>
        </div>
    );
}

"use client";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RecruiterPage() {
    const [resumeText, setResumeText] = useState("");
    const [jdText, setJdText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!resumeText.trim()) { setError("Please paste your resume text."); return; }
        if (!jdText.trim()) { setError("Please paste the job description."); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/recruiter-signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, match_score: 0 }),
            });
            const data = await res.json();
            setResult(data);
        } catch { setError("Failed to analyze. Is the backend running?"); }
        setLoading(false);
    };

    const verdictStyles: Record<string, { color: string; bg: string; label: string; icon: string }> = {
        shortlist: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Shortlisted ✅", icon: "🟢" },
        maybe: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Maybe Pile", icon: "🟡" },
        likely_skip: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Likely Skip", icon: "🟠" },
        auto_reject: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "Auto-Reject ❌", icon: "🔴" },
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
            <div className="orb orb-1" style={{ top: "-200px", right: "-200px" }} />
            <div className="orb orb-3" style={{ bottom: "5%", left: "-100px" }} />

            <nav className="nav-blur" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 32px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
                        <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, color: "var(--text-primary)" }}>Career<span className="gradient-text">Copilot</span></span>
                    </Link>
                    <Link href="/analyze"><button className="btn-secondary" style={{ padding: "8px 18px", fontSize: "0.83rem" }}>← Back to Analyze</button></Link>
                </div>
            </nav>

            <div style={{ paddingTop: 100, maxWidth: 900, margin: "0 auto", padding: "100px 24px 80px" }}>
                <div style={{ textAlign: "center", marginBottom: 48 }} className="animate-fade-in-up">
                    <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 12 }}>
                        🧠 Recruiter <span className="gradient-text">Signal Intelligence</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>See your profile through a recruiter&apos;s eyes. First-in-market.</p>
                </div>

                {!result ? (
                    <div className="glass-card animate-fade-in-up delay-100" style={{ padding: 32 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>📄 Your Resume</label>
                                <textarea className="input-glass" placeholder="Paste your resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} style={{ minHeight: 240, resize: "vertical", lineHeight: 1.6, fontSize: "0.85rem" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>📋 Job Description</label>
                                <textarea className="input-glass" placeholder="Paste the job description here..." value={jdText} onChange={e => setJdText(e.target.value)} style={{ minHeight: 240, resize: "vertical", lineHeight: 1.6, fontSize: "0.85rem" }} />
                            </div>
                        </div>
                        {error && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "0.875rem" }}>⚠️ {error}</div>}
                        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: "16px 48px", fontSize: "1rem", opacity: loading ? 0.7 : 1 }}>
                                {loading ? <><div className="spinner" style={{ display: "inline-block", marginRight: 8 }} /> Simulating...</> : "🧠 Simulate Recruiter Review"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Verdict Banner */}
                        {(() => {
                            const v = verdictStyles[result.recruiter_verdict] || verdictStyles.maybe;
                            return (
                                <div className="glass-card" style={{ padding: 32, textAlign: "center", background: v.bg, border: `1px solid ${v.color}40` }}>
                                    <div style={{ fontSize: "3rem", marginBottom: 12 }}>{v.icon}</div>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: v.color, marginBottom: 8 }}>{v.label}</div>
                                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>{result.verdict_reasoning}</p>
                                </div>
                            );
                        })()}

                        {/* Key Metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                            <div className="glass-card" style={{ padding: 22, textAlign: "center" }}>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Interview Likelihood</div>
                                <div style={{ fontSize: "2rem", fontWeight: 800 }} className="gradient-text">{result.interview_likelihood_pct || 0}%</div>
                            </div>
                            <div className="glass-card" style={{ padding: 22, textAlign: "center" }}>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Pile Position</div>
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)" }}>{(result.pile_position?.estimated_rank || "").replace(/_/g, " ")}</div>
                            </div>
                            <div className="glass-card" style={{ padding: 22, textAlign: "center" }}>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>ATS Pass</div>
                                <div style={{ fontSize: "2rem" }}>{result.ats_pass_prediction ? "✅" : "❌"}</div>
                            </div>
                        </div>

                        {/* First Impression */}
                        {result.first_impression && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>👁️ First 6 Seconds — What the Recruiter Sees</h2>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.first_impression}</p>
                            </div>
                        )}

                        {/* Skip Reasons */}
                        {result.skip_reasons?.length > 0 && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, color: "var(--accent-rose)" }}>⚠️ Why a Recruiter Would Skip You</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {result.skip_reasons.map((sr: any, i: number) => (
                                        <div key={i} style={{ padding: 16, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: 10 }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent-rose)", marginBottom: 6 }}>❌ {sr.reason}</div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>✅ Fix: {sr.fix}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Strengths */}
                        {result.strengths_noticed?.length > 0 && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 14, color: "var(--accent-green)" }}>💪 What Stands Out Positively</h2>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {result.strengths_noticed.map((s: string, i: number) => <span key={i} className="chip chip-green">{s}</span>)}
                                </div>
                            </div>
                        )}

                        {/* Shortlist Fixes */}
                        {result.shortlist_fixes?.length > 0 && (
                            <div className="glass-card glow-indigo" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 14 }}>🚀 Changes That Move You to &quot;Shortlist&quot;</h2>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {result.shortlist_fixes.map((f: string, i: number) => (
                                        <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                            <span style={{ color: "var(--accent-indigo)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Pile Position Detail */}
                        {result.pile_position?.explanation && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>📊 Pile Position Analysis</h2>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.pile_position.explanation}</p>
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                            <button className="btn-secondary" onClick={() => setResult(null)} style={{ padding: "12px 32px" }}>← Analyze Again</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LinkedInPage() {
    const [headline, setHeadline] = useState("");
    const [about, setAbout] = useState("");
    const [currentSkills, setCurrentSkills] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [keySkills, setKeySkills] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!targetRole.trim() && !headline.trim()) { setError("Provide at least a target role or current headline."); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/linkedin-optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_headline: headline, current_about: about, current_skills: currentSkills,
                    target_role: targetRole, key_skills: keySkills.split(",").map(s => s.trim()).filter(Boolean),
                }),
            });
            const data = await res.json();
            setResult(data);
        } catch { setError("Failed to optimize. Is the backend running?"); }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
            <div className="orb orb-1" style={{ top: "-200px", left: "-200px" }} />
            <div className="orb orb-2" style={{ bottom: "10%", right: "-100px" }} />

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
                        🔗 LinkedIn <span className="gradient-text">Optimizer</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>80% of recruiter sourcing happens on LinkedIn. Make your profile work.</p>
                </div>

                {!result ? (
                    <div className="glass-card animate-fade-in-up delay-100" style={{ padding: 32 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Target Role</label>
                                    <input className="input-glass" placeholder="e.g., Senior SAP Consultant" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Key Skills (comma-separated)</label>
                                    <input className="input-glass" placeholder="e.g., SAP S/4HANA, FICO, Python" value={keySkills} onChange={e => setKeySkills(e.target.value)} />
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Current Headline</label>
                                <input className="input-glass" placeholder="Paste your current LinkedIn headline..." value={headline} onChange={e => setHeadline(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Current About Section</label>
                                <textarea className="input-glass" placeholder="Paste your current LinkedIn About section..." value={about} onChange={e => setAbout(e.target.value)} style={{ minHeight: 140, resize: "vertical", lineHeight: 1.6 }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Current Skills Listed</label>
                                <input className="input-glass" placeholder="e.g., SAP, SQL, Project Management" value={currentSkills} onChange={e => setCurrentSkills(e.target.value)} />
                            </div>
                        </div>
                        {error && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "0.875rem" }}>⚠️ {error}</div>}
                        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: "16px 48px", fontSize: "1rem", opacity: loading ? 0.7 : 1 }}>
                                {loading ? <><div className="spinner" style={{ display: "inline-block", marginRight: 8 }} /> Optimizing...</> : "🔗 Optimize My LinkedIn"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Score Before/After */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Before</div>
                                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-rose)" }}>{result.profile_score_before || 0}%</div>
                            </div>
                            <div className="glass-card glow-indigo" style={{ padding: 24, textAlign: "center" }}>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>After</div>
                                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-green)" }}>{result.profile_score_after || 0}%</div>
                            </div>
                        </div>

                        {/* Optimized Headline */}
                        <div className="glass-card" style={{ padding: 28 }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>✨ Optimized Headline</h2>
                            <div style={{ padding: 16, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>{result.optimized_headline}</div>
                            {result.headline_reasoning && <p style={{ marginTop: 10, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>💡 {result.headline_reasoning}</p>}
                        </div>

                        {/* Optimized About */}
                        <div className="glass-card" style={{ padding: 28 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>📝 Optimized About Section</h2>
                                <button className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={() => navigator.clipboard.writeText(result.optimized_about || "")}>📋 Copy</button>
                            </div>
                            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-inter)", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>{result.optimized_about}</pre>
                            {result.about_reasoning && <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>💡 {result.about_reasoning}</p>}
                        </div>

                        {/* Skills */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                            <div className="glass-card" style={{ padding: 22 }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 12, color: "var(--accent-green)" }}>✅ Add These Skills</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(result.skills_to_add || []).map((s: string, i: number) => <span key={i} className="chip chip-green" style={{ fontSize: "0.78rem" }}>+ {s}</span>)}
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: 22 }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 12, color: "var(--accent-rose)" }}>❌ Remove These</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(result.skills_to_remove || []).map((s: string, i: number) => <span key={i} className="chip chip-rose" style={{ fontSize: "0.78rem" }}>- {s}</span>)}
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: 22 }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 12, color: "var(--accent-indigo)" }}>⭐ Prioritize</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(result.skills_to_prioritize || []).map((s: string, i: number) => <span key={i} className="chip chip-indigo" style={{ fontSize: "0.78rem" }}>{i + 1}. {s}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Activity & Connection */}
                        {result.activity_suggestions?.length > 0 && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 14 }}>📢 Content Ideas to Post</h2>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {result.activity_suggestions.map((a: string, i: number) => (
                                        <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                            <span style={{ color: "var(--accent-cyan)", flexShrink: 0 }}>→</span> {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.connection_strategy && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>🤝 Connection Strategy</h2>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.connection_strategy}</p>
                            </div>
                        )}

                        {/* Top Improvements */}
                        {result.top_improvements?.length > 0 && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 14 }}>🏆 Top Improvements Made</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {result.top_improvements.map((t: string, i: number) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                            <span style={{ color: "var(--accent-green)" }}>✓</span> {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                            <button className="btn-secondary" onClick={() => setResult(null)} style={{ padding: "12px 32px" }}>← Optimize Again</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";
import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SalaryPage() {
    const [role, setRole] = useState("");
    const [location, setLocation] = useState("India");
    const [seniority, setSeniority] = useState("mid");
    const [years, setYears] = useState("5-8");
    const [skills, setSkills] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!role.trim()) { setError("Please enter a role title."); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/salary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role_title: role,
                    location,
                    seniority,
                    years_experience: years,
                    key_skills: skills.split(",").map(s => s.trim()).filter(Boolean),
                }),
            });
            const data = await res.json();
            setResult(data);
        } catch { setError("Failed to fetch salary data. Is the backend running?"); }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
            <div className="orb orb-1" style={{ top: "-200px", right: "-100px" }} />
            <div className="orb orb-2" style={{ bottom: "10%", left: "-100px" }} />

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
                        💰 Salary <span className="gradient-text">Intelligence</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>Know your worth. Negotiate with confidence.</p>
                </div>

                {!result ? (
                    <div className="glass-card animate-fade-in-up delay-100" style={{ padding: 32 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Role Title *</label>
                                <input className="input-glass" placeholder="e.g., Senior SAP Consultant" value={role} onChange={e => setRole(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Location</label>
                                <select className="input-glass" value={location} onChange={e => setLocation(e.target.value)} style={{ cursor: "pointer" }}>
                                    <option value="India">India</option><option value="USA">USA</option><option value="UK">UK</option><option value="Germany">Germany</option><option value="Singapore">Singapore</option><option value="UAE">UAE</option><option value="Canada">Canada</option><option value="Australia">Australia</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Seniority Level</label>
                                <select className="input-glass" value={seniority} onChange={e => setSeniority(e.target.value)} style={{ cursor: "pointer" }}>
                                    <option value="junior">Junior</option><option value="mid">Mid-Level</option><option value="senior">Senior</option><option value="lead">Lead / Principal</option><option value="manager">Manager</option><option value="director">Director</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Years of Experience</label>
                                <select className="input-glass" value={years} onChange={e => setYears(e.target.value)} style={{ cursor: "pointer" }}>
                                    <option value="0-2">0-2 years</option><option value="3-5">3-5 years</option><option value="5-8">5-8 years</option><option value="8-12">8-12 years</option><option value="12+">12+ years</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Key Skills (comma-separated)</label>
                                <input className="input-glass" placeholder="e.g., SAP S/4HANA, SAP FICO, Python, AWS" value={skills} onChange={e => setSkills(e.target.value)} />
                            </div>
                        </div>
                        {error && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "0.875rem" }}>⚠️ {error}</div>}
                        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: "16px 48px", fontSize: "1rem", opacity: loading ? 0.7 : 1 }}>
                                {loading ? <><div className="spinner" style={{ display: "inline-block", marginRight: 8 }} /> Analyzing...</> : "💰 Get Salary Intelligence"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Salary Range */}
                        <div className="glass-card" style={{ padding: 28 }}>
                            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>📊 Salary Range</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                {[
                                    { label: "Low End", value: result.salary_range?.low, color: "var(--accent-amber)" },
                                    { label: "Median", value: result.salary_range?.median, color: "var(--accent-green)" },
                                    { label: "Top End", value: result.salary_range?.high, color: "var(--accent-cyan)" },
                                ].map((s, i) => (
                                    <div key={i} style={{ textAlign: "center", padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comp Breakdown */}
                        {result.total_comp_breakdown && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>📦 Total Compensation Breakdown</h2>
                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    {[
                                        { label: "Base", pct: result.total_comp_breakdown.base_salary_pct, color: "#6366f1" },
                                        { label: "Bonus", pct: result.total_comp_breakdown.bonus_pct, color: "#10b981" },
                                        { label: "Equity", pct: result.total_comp_breakdown.equity_pct, color: "#f59e0b" },
                                        { label: "Benefits", pct: result.total_comp_breakdown.benefits_pct, color: "#06b6d4" },
                                    ].map((c, i) => (
                                        <div key={i} style={{ flex: 1, minWidth: 100, padding: 16, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${c.color}30` }}>
                                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: c.color }}>{c.pct}%</div>
                                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 4 }}>{c.label}</div>
                                        </div>
                                    ))}
                                </div>
                                {result.total_comp_breakdown.notes && <p style={{ marginTop: 14, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.total_comp_breakdown.notes}</p>}
                            </div>
                        )}

                        {/* Negotiation Script */}
                        {result.negotiation_script && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>🗣️ Negotiation Scripts</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {Object.entries(result.negotiation_script).map(([key, val]) => (
                                        <div key={key} style={{ padding: 16, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10 }}>
                                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-indigo)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{key.replace(/_/g, " ")}</div>
                                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{val as string}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Market Insight */}
                        {result.market_insight && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>🌐 Market Insight</h2>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.market_insight}</p>
                            </div>
                        )}

                        {/* Factors */}
                        {result.factors_affecting_pay?.length > 0 && (
                            <div className="glass-card" style={{ padding: 28 }}>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 14 }}>⚙️ Factors Affecting Pay</h2>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {result.factors_affecting_pay.map((f: string, i: number) => (
                                        <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                            <span style={{ color: "var(--accent-indigo)", flexShrink: 0 }}>→</span> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Disclaimer */}
                        {result.disclaimer && (
                            <div style={{ padding: "14px 20px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.8rem", color: "var(--accent-amber)", lineHeight: 1.6 }}>
                                ⚠️ {result.disclaimer}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                            <button className="btn-secondary" onClick={() => setResult(null)} style={{ padding: "12px 32px" }}>← Try Another Role</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

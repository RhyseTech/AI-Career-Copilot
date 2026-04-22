"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "overview" | "gaps" | "resume" | "interview" | "roadmap";

interface AnalysisResult {
    match_score: number;
    resume_text: string;
    parsed_skills: string[];
    parsed_experience: string[];
    jd_required_skills: string[];
    jd_seniority: string;
    skill_gaps: { skill: string; priority: string; reason: string }[];
    matched_skills: string[];
    experience_gaps: string[];
    summary: string;
}

// ── Score Ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
    const [animated, setAnimated] = useState(false);
    const r = 54, circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
    const label = score >= 75 ? "Strong Fit" : score >= 50 ? "Moderate Fit" : "Needs Work";

    useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle cx="70" cy="70" r={r} fill="none"
                        stroke={color} strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={animated ? offset : circ}
                        style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 8px ${color}60)` }}
                    />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 3 }}>Match</span>
                </div>
            </div>
            <span className="chip" style={{ fontSize: "0.78rem", background: `${color}20`, color, borderColor: `${color}40` }}>{label}</span>
        </div>
    );
}

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{title}</h2>
            </div>
            {subtitle && <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginLeft: 36 }}>{subtitle}</p>}
        </div>
    );
}

// ── Accordion item (interview questions) ────────────────────────────────────
function AccordionItem({ q, idx }: { q: { category: string; question: string; ideal_answer: string }; idx: number }) {
    const [open, setOpen] = useState(false);
    const catColor: Record<string, string> = { behavioral: "chip-amber", technical: "chip-indigo", situational: "chip-cyan" };
    return (
        <div className="glass-card" style={{ overflow: "hidden", marginBottom: 10 }}>
            <button onClick={() => setOpen(!open)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", textAlign: "left" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, width: 24, flexShrink: 0 }}>Q{idx + 1}</span>
                <span className={`chip ${catColor[q.category] || "chip-indigo"}`} style={{ flexShrink: 0, textTransform: "capitalize" }}>{q.category}</span>
                <span style={{ flex: 1, color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 500 }}>{q.question}</span>
                <span style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
            </button>
            {open && (
                <div style={{ padding: "0 20px 18px 58px" }}>
                    <div style={{ padding: "16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                        <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: 6 }}>💡 Ideal Answer:</strong>
                        <div style={{ whiteSpace: "pre-wrap" }}>{q.ideal_answer || "No specific answer provided by AI."}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Roadmap Week Card ─────────────────────────────────────────────────────
function WeekCard({ week }: { week: { week: string; focus: string; actions: string[]; resources: string[] } }) {
    return (
        <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className="timeline-dot" style={{ marginTop: 6 }} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-indigo)" }}>{week.week}</span>
                    </div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 10 }}>{week.focus}</h4>
                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                        {week.actions.map((a, i) => (
                            <li key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ color: "var(--accent-indigo)", flexShrink: 0, marginTop: 2 }}>→</span> {a}
                            </li>
                        ))}
                    </ul>
                    {week.resources.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {week.resources.map((r, i) => <span key={i} className="chip chip-indigo" style={{ fontSize: "0.72rem" }}>📚 {r}</span>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [jobDescription, setJobDescription] = useState("");
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    // Optimize / interview / roadmap state
    const [optimizedResume, setOptimizedResume] = useState("");
    const [keyChanges, setKeyChanges] = useState<string[]>([]);
    const [atsScore, setAtsScore] = useState(0);
    const [interviewQs, setInterviewQs] = useState<any[]>([]);
    const [roadmap, setRoadmap] = useState<any>(null);
    const [loadingTab, setLoadingTab] = useState<Tab | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem("analysisResult");
        const jd = sessionStorage.getItem("jobDescription");
        if (!stored) { router.push("/analyze"); return; }
        setResult(JSON.parse(stored));
        setJobDescription(jd || "");
    }, [router]);

    const fetchOptimize = useCallback(async () => {
        if (!result || optimizedResume) return;
        setLoadingTab("resume");
        try {
            const res = await fetch(`${API}/api/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume_text: result.resume_text, job_description: jobDescription }),
            });
            const data = await res.json();
            setOptimizedResume(data.optimized_resume || "");
            setKeyChanges(data.key_changes || []);
            setAtsScore(data.ats_score_estimate || 0);
        } catch { setOptimizedResume("Failed to generate. Please check your API key."); }
        setLoadingTab(null);
    }, [result, jobDescription, optimizedResume]);

    const fetchInterview = useCallback(async () => {
        if (!result || interviewQs.length) return;
        setLoadingTab("interview");
        try {
            const res = await fetch(`${API}/api/interview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume_text: result.resume_text,
                    job_description: jobDescription,
                    skill_gaps: result.skill_gaps.map(g => g.skill),
                }),
            });
            const data = await res.json();
            setInterviewQs(data.questions || []);
        } catch { setInterviewQs([]); }
        setLoadingTab(null);
    }, [result, jobDescription, interviewQs]);

    const fetchRoadmap = useCallback(async () => {
        if (!result || roadmap) return;
        setLoadingTab("roadmap");
        try {
            const res = await fetch(`${API}/api/roadmap`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skill_gaps: result.skill_gaps.map(g => g.skill) }),
            });
            const data = await res.json();
            setRoadmap(data);
        } catch { setRoadmap(null); }
        setLoadingTab(null);
    }, [result, roadmap]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "resume") fetchOptimize();
        if (tab === "interview") fetchInterview();
        if (tab === "roadmap") fetchRoadmap();
    };

    if (!result) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="spinner" style={{ margin: "0 auto 16px", width: 36, height: 36 }} />
                    <p style={{ color: "var(--text-secondary)" }}>Loading your analysis...</p>
                </div>
            </div>
        );
    }

    const TABS: { id: Tab; label: string; icon: string }[] = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "gaps", label: "Skill Gaps", icon: "🔍" },
        { id: "resume", label: "Optimized Resume", icon: "✍️" },
        { id: "interview", label: "Interview Prep", icon: "🎤" },
        { id: "roadmap", label: "Career Roadmap", icon: "🗺️" },
    ];

    const priorityColor: Record<string, string> = { high: "chip-rose", medium: "chip-amber", low: "chip-cyan" };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative" }}>
            <div className="orb orb-1" style={{ top: "-300px", right: "-200px", opacity: 0.5 }} />

            {/* Nav */}
            <nav className="nav-blur" style={{ position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
                        <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Career<span className="gradient-text">Copilot</span></span>
                    </Link>
                    <Link href="/analyze">
                        <button className="btn-secondary" style={{ padding: "8px 18px", fontSize: "0.83rem" }}>+ New Analysis</button>
                    </Link>
                </div>
            </nav>

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
                {/* Top summary strip */}
                <div className="glass-card animate-fade-in-up" style={{ padding: "24px 32px", marginBottom: 24, display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                    <ScoreRing score={result.match_score} />
                    <div style={{ flex: 1, minWidth: 220 }}>
                        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: 8 }}>Your Career Analysis</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.65 }}>{result.summary}</p>
                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                            <span className="chip chip-green">✅ {result.matched_skills.length} matched skills</span>
                            <span className="chip chip-rose">⚠️ {result.skill_gaps.length} skill gaps</span>
                            <span className="chip chip-indigo">🏷️ {result.jd_seniority} level</span>
                        </div>
                    </div>
                </div>

                {/* Tab nav */}
                <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}
                    className="animate-fade-in-up delay-100">
                    {TABS.map(t => (
                        <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                            onClick={() => handleTabChange(t.id)}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB: Overview ── */}
                {activeTab === "overview" && (
                    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Matched skills */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <SectionHeader icon="✅" title="Matched Skills" subtitle={`${result.matched_skills.length} skills align with the role`} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {result.matched_skills.length > 0 ? result.matched_skills.map(s => (
                                    <span key={s} className="chip chip-green">{s}</span>
                                )) : <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Skills extracted but none directly matched.</p>}
                            </div>
                        </div>

                        {/* Your skills from resume */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <SectionHeader icon="📄" title="Your Resume Skills" subtitle={`${result.parsed_skills.length} skills detected`} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                                {result.parsed_skills.map((s, idx) => (
                                    <span key={`${s}-${idx}`} className="chip chip-indigo">{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* JD required */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <SectionHeader icon="🎯" title="JD Required Skills" subtitle="What the employer is looking for" />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                                {result.jd_required_skills.map((s, idx) => (
                                    <span key={`${s}-${idx}`} className={`chip ${result.matched_skills.map(m => m.toLowerCase()).includes(s.toLowerCase()) ? "chip-green" : "chip-rose"}`}>{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* Experience bullets */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <SectionHeader icon="💼" title="Experience Highlights" subtitle="Top bullets from your resume" />
                            {result.parsed_experience.length > 0 ? (
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {result.parsed_experience.slice(0, 5).map((exp, i) => (
                                        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                            <span style={{ color: "var(--accent-indigo)", flexShrink: 0, marginTop: 2 }}>•</span> {exp}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No structured bullet points detected. Try pasting resume text for better parsing.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: Gaps ── */}
                {activeTab === "gaps" && (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <SectionHeader icon="🔍" title="Skill Gap Analysis" subtitle="Ranked by impact on your application" />
                        {result.skill_gaps.length === 0 ? (
                            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎉</div>
                                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>No Major Skill Gaps!</h3>
                                <p style={{ color: "var(--text-secondary)" }}>Your profile strongly aligns with the job requirements.</p>
                            </div>
                        ) : result.skill_gaps.map((gap, i) => (
                            <div key={i} className="glass-card" style={{ padding: 22, display: "flex", alignItems: "flex-start", gap: 16 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                    background: gap.priority === "high" ? "rgba(244,63,94,0.12)" : gap.priority === "medium" ? "rgba(245,158,11,0.12)" : "rgba(6,182,212,0.12)",
                                    border: `1px solid ${gap.priority === "high" ? "rgba(244,63,94,0.3)" : gap.priority === "medium" ? "rgba(245,158,11,0.3)" : "rgba(6,182,212,0.3)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem"
                                }}>
                                    {gap.priority === "high" ? "🚨" : gap.priority === "medium" ? "⚠️" : "💡"}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                        <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>{gap.skill}</h3>
                                        <span className={`chip ${priorityColor[gap.priority] || "chip-cyan"}`} style={{ textTransform: "capitalize" }}>{gap.priority} priority</span>
                                    </div>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.65 }}>{gap.reason}</p>
                                </div>
                            </div>
                        ))}
                        {result.experience_gaps.length > 0 && (
                            <div className="glass-card" style={{ padding: 24, marginTop: 8 }}>
                                <SectionHeader icon="💼" title="Experience Gaps" subtitle="Areas where your experience may need strengthening" />
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {result.experience_gaps.map((eg, i) => (
                                        <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                            <span style={{ color: "var(--accent-amber)", flexShrink: 0 }}>→</span> {eg}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Resume ── */}
                {activeTab === "resume" && (
                    <div className="animate-fade-in">
                        <SectionHeader icon="✍️" title="AI-Optimized Resume" subtitle="Rewritten for ATS alignment and maximum impact" />
                        {loadingTab === "resume" ? (
                            <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                                <div className="spinner" style={{ margin: "0 auto 16px", width: 36, height: 36 }} />
                                <p style={{ color: "var(--text-secondary)" }}>Rewriting your resume with Llama 3...</p>
                            </div>
                        ) : optimizedResume ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {/* Stat bar */}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                    <div className="glass-card" style={{ padding: "14px 20px", display: "flex", gap: 10, alignItems: "center" }}>
                                        <span style={{ fontSize: "1.3rem" }}>🎯</span>
                                        <div><div style={{ fontWeight: 700, fontSize: "1.1rem" }} className="gradient-text">{atsScore}%</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ATS Score Est.</div></div>
                                    </div>
                                    {keyChanges.slice(0, 2).map((c, i) => (
                                        <div key={i} className="glass-card" style={{ padding: "14px 20px", flex: 1, minWidth: 180 }}>
                                            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>✅ {c}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Resume text */}
                                <div className="glass-card" style={{ padding: 28 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                        <h3 style={{ fontWeight: 600 }}>Optimized Resume</h3>
                                        <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                                            onClick={() => navigator.clipboard.writeText(optimizedResume)}>
                                            📋 Copy
                                        </button>
                                    </div>
                                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-inter)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
                                        {optimizedResume}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                                <p style={{ color: "var(--text-muted)" }}>Click the tab to generate your optimized resume.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Interview ── */}
                {activeTab === "interview" && (
                    <div className="animate-fade-in">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <SectionHeader icon="🎤" title="Interview Preparation" subtitle="10 personalized questions tailored to your profile and the role" />
                            {interviewQs.length > 0 && (
                                <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.82rem", display: "flex", gap: 6, alignItems: "center" }}
                                    onClick={async () => {
                                        const { jsPDF } = await import("jspdf");
                                        const doc = new jsPDF();
                                        doc.setFont("helvetica", "bold");
                                        doc.setFontSize(20);
                                        doc.text("Interview Preparation Guide", 20, 20);
                                        doc.setFontSize(10);
                                        doc.setFont("helvetica", "normal");
                                        doc.text("Generated by AI Career Copilot", 20, 28);

                                        let y = 40;
                                        interviewQs.forEach((q, i) => {
                                            if (y > 270) { doc.addPage(); y = 20; }
                                            doc.setFont("helvetica", "bold");
                                            doc.text(`Q${i + 1} (${q.category}):`, 20, y);
                                            y += 6;
                                            doc.setFont("helvetica", "normal");
                                            const splitQ = doc.splitTextToSize(q.question, 170);
                                            doc.text(splitQ, 20, y);
                                            y += (splitQ.length * 5) + 4;

                                            doc.setFont("helvetica", "bold");
                                            doc.text("Ideal Answer:", 20, y);
                                            y += 6;
                                            doc.setFont("helvetica", "normal");
                                            const splitA = doc.splitTextToSize(q.ideal_answer || "", 170);
                                            doc.text(splitA, 20, y);
                                            y += (splitA.length * 5) + 12;
                                        });
                                        doc.save("AI-Career-Copilot-Interview.pdf");
                                    }}>
                                    📄 Download PDF
                                </button>
                            )}
                        </div>

                        {loadingTab === "interview" ? (
                            <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                                <div className="spinner" style={{ margin: "0 auto 16px", width: 36, height: 36 }} />
                                <p style={{ color: "var(--text-secondary)" }}>Generating personalized interview questions...</p>
                            </div>
                        ) : interviewQs.length > 0 ? (
                            <div>
                                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                                    {[
                                        { label: "Behavioral", color: "chip-amber" },
                                        { label: "Technical", color: "chip-indigo" },
                                        { label: "Situational", color: "chip-cyan" },
                                    ].map(c => (
                                        <span key={c.label} className={`chip ${c.color}`}>{c.label}</span>
                                    ))}
                                </div>
                                {interviewQs.map((q, i) => <AccordionItem key={i} q={q} idx={i} />)}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                                <p style={{ color: "var(--text-muted)" }}>Click the tab to generate your interview questions.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: Roadmap ── */}
                {activeTab === "roadmap" && (
                    <div className="animate-fade-in">
                        <SectionHeader icon="🗺️" title="Career Roadmap" subtitle="Your personalized 60-day action plan" />
                        {loadingTab === "roadmap" ? (
                            <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                                <div className="spinner" style={{ margin: "0 auto 16px", width: 36, height: 36 }} />
                                <p style={{ color: "var(--text-secondary)" }}>Building your career roadmap...</p>
                            </div>
                        ) : roadmap ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                                {/* 30 Day */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                        <span className="chip chip-green">📅 Days 1–30</span>
                                        <h3 style={{ fontWeight: 600 }}>Foundation Phase</h3>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {roadmap.thirty_day_plan?.map((w: any, i: number) => <WeekCard key={i} week={w} />)}
                                    </div>
                                </div>
                                {/* 60 Day */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                        <span className="chip chip-indigo">📅 Days 31–60</span>
                                        <h3 style={{ fontWeight: 600 }}>Application Phase</h3>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {roadmap.sixty_day_plan?.map((w: any, i: number) => <WeekCard key={i} week={w} />)}
                                    </div>
                                </div>
                                {/* Certs & Projects */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                    <div className="glass-card" style={{ padding: 22 }}>
                                        <h3 style={{ fontWeight: 600, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>🏆 Certifications</h3>
                                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                            {roadmap.certifications?.map((c: string, i: number) => (
                                                <li key={i} style={{ display: "flex", gap: 8, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                                    <span style={{ color: "var(--accent-green)" }}>✓</span> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="glass-card" style={{ padding: 22 }}>
                                        <h3 style={{ fontWeight: 600, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>⚙️ Suggested Projects</h3>
                                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                            {roadmap.projects?.map((p: string, i: number) => (
                                                <li key={i} style={{ display: "flex", gap: 8, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                                    <span style={{ color: "var(--accent-cyan)", flexShrink: 0 }}>→</span> {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                                <p style={{ color: "var(--text-muted)" }}>Click the tab to generate your career roadmap.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

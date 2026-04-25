"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const STATS = [
  { value: "3x", label: "Interview callbacks" },
  { value: "87%", label: "ATS pass rate" },
  { value: "< 5min", label: "Full analysis" },
  { value: "10k+", label: "Careers optimized" },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "Resume Intelligence Engine",
    desc: "Deep parsing with career arc detection, impact quantification, and blind spot analysis using AI.",
    color: "var(--accent-indigo)",
    glow: "rgba(99,102,241,0.15)",
    link: "/analyze",
  },
  {
    icon: "🎯",
    title: "Semantic Match Engine",
    desc: "Ontology-aware matching with explainable sub-scores across skills, experience, leadership, and tools.",
    color: "var(--accent-cyan)",
    glow: "rgba(6,182,212,0.12)",
    link: "/analyze",
  },
  {
    icon: "🔍",
    title: "ATS Emulator + Gap Detector",
    desc: "Simulate how ATS systems score your resume, then pinpoint exactly what's missing with learning paths.",
    color: "var(--accent-violet)",
    glow: "rgba(139,92,246,0.12)",
    link: "/analyze",
  },
  {
    icon: "✍️",
    title: "Resume Optimizer",
    desc: "AI rewrites your bullets with quantified impact, ATS alignment, and role-specific keyword injection.",
    color: "var(--accent-green)",
    glow: "rgba(16,185,129,0.12)",
    link: "/analyze",
  },
  {
    icon: "🎤",
    title: "Interview Intelligence",
    desc: "10 personalized behavioral, technical, and situational questions with ideal answers and coaching tips.",
    color: "var(--accent-amber)",
    glow: "rgba(245,158,11,0.12)",
    link: "/analyze",
  },
  {
    icon: "🗺️",
    title: "Career Roadmap",
    desc: "30/60-day action plans with certifications, projects, and resources tailored to your exact gaps.",
    color: "var(--accent-rose)",
    glow: "rgba(244,63,94,0.12)",
    link: "/analyze",
  },
  {
    icon: "💰",
    title: "Salary Intelligence",
    desc: "AI-powered salary benchmarks, negotiation scripts, and total comp breakdown for any role and location.",
    color: "var(--accent-amber)",
    glow: "rgba(245,158,11,0.15)",
    link: "/salary",
  },
  {
    icon: "🔗",
    title: "LinkedIn Optimizer",
    desc: "AI rewrites your headline, about section, and skills for maximum recruiter discoverability.",
    color: "var(--accent-cyan)",
    glow: "rgba(6,182,212,0.15)",
    link: "/linkedin",
  },
  {
    icon: "🕵️",
    title: "Recruiter Signal Intelligence",
    desc: "See how recruiters perceive your profile — skip reasons, pile position, and shortlist fixes. First-in-market.",
    color: "var(--accent-rose)",
    glow: "rgba(244,63,94,0.15)",
    link: "/recruiter",
  },
];

const COMPARISON = [
  { capability: "Resume Optimization", them: true, us: true },
  { capability: "ATS Scoring", them: true, us: true },
  { capability: "Semantic Skill Matching", them: false, us: true },
  { capability: "Skill Gap Analysis", them: false, us: true },
  { capability: "Interview Prep", them: false, us: true },
  { capability: "Career Roadmap", them: false, us: true },
  { capability: "Continuous Improvement", them: false, us: true },
  { capability: "Autonomous Execution", them: false, us: true },
];

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "Free",
    subtitle: "Best for quick career checks",
    badge: "Try Now",
    tone: "chip-cyan",
    features: [
      "Resume + JD analysis",
      "Skill gap detection",
      "ATS score snapshot",
      "Basic interview prep",
    ],
  },
  {
    name: "Pro",
    price: "₹999/mo",
    subtitle: "Best for active job seekers",
    badge: "Most Popular",
    tone: "chip-indigo",
    features: [
      "Full multi-tab dashboard",
      "ATS-friendly resume download",
      "Expanded interview question bank",
      "Salary, LinkedIn, and recruiter insights",
    ],
  },
  {
    name: "Teams",
    price: "Custom",
    subtitle: "Best for academies and placement cells",
    badge: "For Organizations",
    tone: "chip-amber",
    features: [
      "Bulk candidate analysis",
      "Shared templates and playbooks",
      "Role-specific coaching flows",
      "Priority support and onboarding",
    ],
  },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count}{suffix}</span>;
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
      {/* Background Orbs */}
      <div className="orb orb-1" style={{ top: "-200px", left: "-200px" }} />
      <div className="orb orb-2" style={{ top: "30%", right: "-150px" }} />
      <div className="orb orb-3" style={{ bottom: "10%", left: "20%" }} />

      {/* NAV */}
      <nav className="nav-blur" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18
            }}>⚡</div>
            <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
              Career<span className="gradient-text">Copilot</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/analyze">
              <button className="btn-secondary" style={{ padding: "9px 20px", fontSize: "0.87rem" }}>Log In</button>
            </Link>
            <Link href="/analyze">
              <button className="btn-primary" style={{ padding: "9px 20px", fontSize: "0.87rem" }}>Get Started Free →</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: "140px", paddingBottom: "100px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28 }}
            className="animate-fade-in-up">
            <span className="chip chip-indigo" style={{ fontSize: "0.8rem", padding: "6px 16px" }}>
              🚀 AI-Powered Career OS · SAP-First
            </span>
          </div>

          <h1 className="animate-fade-in-up delay-100"
            style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.08, marginBottom: 28, letterSpacing: "-0.03em" }}>
            Your Career Deserves<br />
            <span className="gradient-text">More Than a Resume</span><br />
            Builder
          </h1>

          <p className="animate-fade-in-up delay-200"
            style={{ fontSize: "1.2rem", color: "var(--text-secondary)", maxWidth: 650, margin: "0 auto 48px", lineHeight: 1.7 }}>
            An autonomous AI system that analyzes your profile, detects exactly what's missing,
            rewrites your resume, and builds your career roadmap — in under 5 minutes.
          </p>

          <div className="animate-fade-in-up delay-300" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/analyze">
              <button className="btn-primary" style={{ padding: "16px 36px", fontSize: "1.05rem" }}>
                🎯 Analyze My Profile — Free
              </button>
            </Link>
            <button className="btn-secondary" style={{ padding: "16px 28px", fontSize: "1.05rem" }}>
              Watch Demo ▶
            </button>
          </div>

          <p className="animate-fade-in-up delay-400"
            style={{ marginTop: 20, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            No signup required · Instant results · Built on Llama 3 + Groq
          </p>
        </div>

        {/* Floating Dashboard Preview */}
        {mounted && (
          <div className="animate-fade-in-up delay-500" style={{ maxWidth: 800, margin: "64px auto 0", padding: "0 24px" }}>
            <div className="glass-card animate-float" style={{ padding: 24, position: "relative" }}>
              <div style={{
                position: "absolute", inset: -1, borderRadius: 17,
                background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(6,182,212,0.1), rgba(139,92,246,0.2))",
                zIndex: -1, filter: "blur(1px)"
              }} />
              {/* Mock Dashboard */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 20, alignItems: "center" }}>
                {/* Score ring mock */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width="120" height="120" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r="40" className="score-ring-track" />
                    <circle cx="45" cy="45" r="40" className="score-ring-fill"
                      stroke="url(#heroGrad)"
                      style={{ strokeDashoffset: mounted ? 251 - (0.82 * 251) : 251 }} />
                    <defs>
                      <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <text x="45" y="45" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="16" fontWeight="700">82%</text>
                    <text x="45" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">Match Score</text>
                  </svg>
                </div>
                {/* Right side */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["SAP S/4HANA ✓", "Python ✓", "SQL ✓", "ABAP ✓"].map(s => (
                      <span key={s} className="chip chip-green" style={{ fontSize: "0.72rem" }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["SAP BW ✗", "Power BI ✗", "Fiori ✗"].map(s => (
                      <span key={s} className="chip chip-rose" style={{ fontSize: "0.72rem" }}>{s}</span>
                    ))}
                  </div>
                  <div className="skeleton" style={{ height: 10, width: "70%" }} />
                  <div className="skeleton" style={{ height: 10, width: "50%" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STATS */}
      <section style={{ padding: "60px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
          {STATS.map((stat, i) => (
            <div key={i} className="glass-card" style={{ padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, fontFamily: "var(--font-space)" }} className="gradient-text">
                {stat.value}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="chip chip-cyan" style={{ marginBottom: 16 }}>Full Feature Suite</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700 }}>
              Everything You Need to<br /><span className="gradient-text">Land the Role</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: "1.05rem" }}>
              One system. Multiple intelligent engines. Zero manual work.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Link key={i} href={f.link || "/analyze"} style={{ textDecoration: "none" }}>
              <div className="glass-card" style={{ padding: 28, height: "100%" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: f.glow, border: `1px solid ${f.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", marginBottom: 16
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>{f.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{f.desc}</p>
                <div style={{ marginTop: 16, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${f.color}, transparent)`, width: "40%" }} />
              </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="chip chip-indigo" style={{ marginBottom: 16 }}>Pricing</span>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700 }}>
              Choose the <span className="gradient-text">Right Plan</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: "1.02rem" }}>
              Start free, upgrade when you need deeper optimization and downloadable ATS-ready outputs.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {PRICING_PLANS.map((plan) => (
              <div key={plan.name} className={`glass-card ${plan.name === "Pro" ? "glow-indigo" : ""}`} style={{ padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{plan.name}</h3>
                  <span className={`chip ${plan.tone}`}>{plan.badge}</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 6 }} className={plan.name === "Pro" ? "gradient-text" : ""}>
                  {plan.price}
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 18 }}>{plan.subtitle}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.55 }}>
                      <span style={{ color: "var(--accent-green)", flexShrink: 0 }}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/analyze">
                  <button className={plan.name === "Pro" ? "btn-primary" : "btn-secondary"} style={{ width: "100%", padding: "14px 18px", fontSize: "0.92rem" }}>
                    {plan.name === "Teams" ? "Contact Sales" : "Start Now"}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, marginBottom: 16 }}>
            How It <span className="gradient-text">Works</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 56, fontSize: "1.05rem" }}>
            From raw resume to career-ready in 4 steps.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
            {[
              { step: "01", icon: "📄", title: "Upload Resume", desc: "PDF or paste text" },
              { step: "02", icon: "📋", title: "Paste Job Description", desc: "Any JD from any platform" },
              { step: "03", icon: "⚡", title: "AI Analyzes", desc: "Multi-engine processing" },
              { step: "04", icon: "🚀", title: "Get Results", desc: "Match score + full plan" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))",
                  border: "1px solid rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", position: "relative"
                }}>
                  {s.icon}
                  <span style={{
                    position: "absolute", top: -8, right: -8,
                    background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                    borderRadius: "50%", width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.65rem", fontWeight: 700
                  }}>{s.step}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{s.title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700 }}>
              vs. <span className="gradient-text">Everything Else</span>
            </h2>
          </div>
          <div className="glass-card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Capability</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", width: 120 }}>Traditional Tools</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, textAlign: "center", width: 120 }} className="gradient-text">Career Copilot</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr auto auto",
                padding: "14px 24px",
                borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--border-subtle)" : "none",
                background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                alignItems: "center",
              }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{row.capability}</span>
                <span style={{ textAlign: "center", width: 120, fontSize: "1.1rem" }}>{row.them ? "✅" : "❌"}</span>
                <span style={{ textAlign: "center", width: 120, fontSize: "1.1rem" }}>✅</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div className="glass-card glow-indigo" style={{ padding: "64px 48px" }}>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: 16 }}>
              Ready to <span className="gradient-text">Land the Job?</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 36, fontSize: "1.1rem", lineHeight: 1.7 }}>
              Upload your resume and a job description.<br />
              Get your complete career analysis in under 5 minutes.
            </p>
            <Link href="/analyze">
              <button className="btn-primary" style={{ padding: "18px 48px", fontSize: "1.1rem" }}>
                🚀 Start for Free — No Signup Needed
              </button>
            </Link>
            <p style={{ marginTop: 20, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Powered by Groq · Llama 3 · sentence-transformers
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "32px 48px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>CareerCopilot</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>© 2026 AI Career Copilot · SAP-first, extensible to all domains</p>
        </div>
      </footer>
    </div>
  );
}

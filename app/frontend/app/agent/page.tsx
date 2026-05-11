"use client";

import Link from "next/link";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AgentResult {
  status?: string;
  draft?: string;
  outreach?: string;
  plan?: Record<string, unknown>;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Request failed.");
  return payload as T;
}

export default function AgentPage() {
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [candidateSummary, setCandidateSummary] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("Recruiter");
  const [loading, setLoading] = useState<"" | "plan" | "email" | "outreach">("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentResult>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("careerCopilotToken") || "" : "";
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const runPlan = async () => {
    setLoading("plan");
    setError("");
    try {
      const payload = await fetchJson<AgentResult>(`${API}/api/agent/auto-apply-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          role_title: roleTitle,
          company_name: companyName,
          resume_summary: candidateSummary,
          job_description: jobDescription,
          constraints: ["Manual final submit only", "No fabricated claims"],
        }),
      });
      setResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to build plan.");
    } finally {
      setLoading("");
    }
  };

  const runEmailDraft = async () => {
    setLoading("email");
    setError("");
    try {
      const payload = await fetchJson<AgentResult>(`${API}/api/agent/email-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          recipient_name: recipientName || "Hiring Team",
          role_title: roleTitle,
          company_name: companyName,
          candidate_summary: candidateSummary,
          tone: "professional",
          key_points: ["Role fit", "Impact outcomes", "Interview availability"],
        }),
      });
      setResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to draft email.");
    } finally {
      setLoading("");
    }
  };

  const runOutreach = async () => {
    setLoading("outreach");
    setError("");
    try {
      const payload = await fetchJson<AgentResult>(`${API}/api/agent/recruiter-outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          recipient_name: recipientName || "Recruiter",
          recipient_role: recipientRole,
          company_name: companyName,
          context: `Interested in ${roleTitle || "open roles"}.`,
          candidate_summary: candidateSummary,
          ask: "Would you be open to a short conversation this week?",
        }),
      });
      setResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to draft outreach.");
    } finally {
      setLoading("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "30px 22px" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto", display: "grid", gap: 20 }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}>
            CareerCopilot
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard" className="btn-secondary" style={{ padding: "10px 14px", textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link href="/auth" className="btn-secondary" style={{ padding: "10px 14px", textDecoration: "none" }}>
              Account
            </Link>
          </div>
        </nav>

        <div className="glass-card" style={{ padding: 24, display: "grid", gap: 14 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>Agent Workspace</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Build an auto-apply action plan, generate application email drafts, and prepare recruiter outreach in one place.
          </p>

          <input className="input-glass" placeholder="Target role title" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} />
          <input className="input-glass" placeholder="Company name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          <input className="input-glass" placeholder="Recipient name (optional)" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
          <input className="input-glass" placeholder="Recipient role (e.g., Recruiter)" value={recipientRole} onChange={(event) => setRecipientRole(event.target.value)} />
          <textarea
            className="input-glass"
            placeholder="Candidate summary"
            value={candidateSummary}
            onChange={(event) => setCandidateSummary(event.target.value)}
            style={{ minHeight: 120, resize: "vertical" }}
          />
          <textarea
            className="input-glass"
            placeholder="Paste job description (recommended for better plan quality)"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            style={{ minHeight: 140, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" style={{ padding: "11px 14px" }} onClick={() => void runPlan()} disabled={loading !== ""}>
              {loading === "plan" ? "Planning..." : "Build Auto-Apply Plan"}
            </button>
            <button className="btn-secondary" style={{ padding: "11px 14px" }} onClick={() => void runEmailDraft()} disabled={loading !== ""}>
              {loading === "email" ? "Drafting..." : "Draft Application Email"}
            </button>
            <button className="btn-secondary" style={{ padding: "11px 14px" }} onClick={() => void runOutreach()} disabled={loading !== ""}>
              {loading === "outreach" ? "Writing..." : "Draft Recruiter Outreach"}
            </button>
          </div>

          {error ? <div style={{ color: "#fda4af" }}>{error}</div> : null}
        </div>

        {(result.draft || result.outreach || result.plan) ? (
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 12 }}>Agent Output</h2>
            {result.plan ? (
              <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
                {JSON.stringify(result.plan, null, 2)}
              </pre>
            ) : null}
            {result.draft ? (
              <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>{result.draft}</pre>
            ) : null}
            {result.outreach ? (
              <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.outreach}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

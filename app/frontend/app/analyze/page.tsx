"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ResumeMode = "file" | "text";
type JobMode = "text" | "file" | "link";
type LoadingStep = "idle" | "parsing" | "matching" | "analyzing" | "done";
type DropTarget = "resume" | "job" | null;

const LOADING_STEPS: { key: Exclude<LoadingStep, "idle">; label: string }[] = [
  { key: "parsing", label: "Reading your resume and target role" },
  { key: "matching", label: "Comparing resume skills with the job" },
  { key: "analyzing", label: "Finding missing skills and study needs" },
  { key: "done", label: "Building your dashboard" },
];

function formatBytes(size: number) {
  if (!size) return "0 KB";
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function getDomainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "job link";
  }
}

function SourceToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; hint: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            style={{
              flex: "1 1 160px",
              borderRadius: 14,
              border: active ? "1px solid rgba(34,211,238,0.35)" : "1px solid var(--border-subtle)",
              background: active ? "linear-gradient(180deg, rgba(14,165,233,0.14), rgba(99,102,241,0.12))" : "rgba(255,255,255,0.02)",
              padding: "14px 16px",
              textAlign: "left",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{option.label}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{option.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);

  const [resumeMode, setResumeMode] = useState<ResumeMode>("file");
  const [jobMode, setJobMode] = useState<JobMode>("text");
  const [activeDropTarget, setActiveDropTarget] = useState<DropTarget>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");

  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState("");
  const [location, setLocation] = useState("India");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<LoadingStep>("idle");

  const persistToMemory = useCallback(async (analysisPayload: Record<string, unknown>, resolvedJobDescription: string) => {
    const token = localStorage.getItem("careerCopilotToken");
    if (!token) return;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      await fetch(`${API}/api/memory/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: ((analysisPayload.jd_parsed as { role_title?: string } | undefined)?.role_title || "Career analysis"),
          analysis_result: analysisPayload,
          job_description: resolvedJobDescription,
        }),
      });

      await fetch(`${API}/api/memory/progress`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          event_type: "analysis_completed",
          score: Number(analysisPayload.match_score || 0),
          details: {
            role_title: (analysisPayload.jd_parsed as { role_title?: string } | undefined)?.role_title || "",
            skill_gaps: Array.isArray(analysisPayload.skill_gaps) ? analysisPayload.skill_gaps.length : 0,
          },
        }),
      });
    } catch {
      // Keep the analysis flow non-blocking when memory persistence fails.
    }
  }, []);

  const supportedResumeHint = useMemo(
    () => (resumeFile ? `${resumeFile.name} - ${formatBytes(resumeFile.size)}` : "PDF or DOCX up to 10MB"),
    [resumeFile]
  );
  const supportedJobHint = useMemo(() => {
    if (jobMode === "file" && jobDescriptionFile) {
      return `${jobDescriptionFile.name} - ${formatBytes(jobDescriptionFile.size)}`;
    }
    if (jobMode === "link" && jobDescriptionUrl.trim()) {
      return `Source: ${getDomainLabel(jobDescriptionUrl.trim())}`;
    }
    if (jobMode === "text" && jobDescription.trim()) {
      return `${jobDescription.length} characters added`;
    }
    return "Paste text, upload TXT/PDF/DOCX, or add a LinkedIn or careers link";
  }, [jobDescription, jobDescriptionFile, jobDescriptionUrl, jobMode]);

  const isResumeFileSupported = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    return (
      file.type === "application/pdf" ||
      name.endsWith(".pdf") ||
      name.endsWith(".docx")
    );
  }, []);

  const isJobFileSupported = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    return (
      file.type === "application/pdf" ||
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".txt") ||
      name.endsWith(".md")
    );
  }, []);

  const handleDrop = useCallback(
    (target: DropTarget, file: File | undefined) => {
      setActiveDropTarget(null);
      if (!target || !file) return;

      if (target === "resume") {
        if (!isResumeFileSupported(file)) {
          setError("Resume upload supports PDF or DOCX.");
          return;
        }
        setResumeFile(file);
        setError("");
        return;
      }

      if (!isJobFileSupported(file)) {
        setError("JD upload supports TXT, PDF, DOCX, or Markdown files.");
        return;
      }
      setJobDescriptionFile(file);
      setError("");
    },
    [isJobFileSupported, isResumeFileSupported]
  );

  async function handleSubmit() {
    if (resumeMode === "file" && !resumeFile) {
      setError("Please upload your resume.");
      return;
    }
    if (resumeMode === "text" && !resumeText.trim()) {
      setError("Please paste your resume text.");
      return;
    }

    if (jobMode === "text" && !jobDescription.trim()) {
      setError("Please paste the job description.");
      return;
    }
    if (jobMode === "file" && !jobDescriptionFile) {
      setError("Please upload the JD file.");
      return;
    }
    if (jobMode === "link" && !jobDescriptionUrl.trim()) {
      setError("Please add a job link.");
      return;
    }

    setLoading(true);
    setError("");

    const steps: Exclude<LoadingStep, "idle">[] = ["parsing", "matching", "analyzing", "done"];
    let stepIndex = 0;
    const timer = window.setInterval(() => {
      if (stepIndex < steps.length) {
        setStep(steps[stepIndex]);
        stepIndex += 1;
      } else {
        window.clearInterval(timer);
      }
    }, 900);

    try {
      const formData = new FormData();

      if (resumeMode === "file" && resumeFile) {
        formData.append("resume_file", resumeFile);
      } else {
        formData.append("resume_text", resumeText);
      }

      if (jobMode === "text") {
        formData.append("job_description", jobDescription);
      } else if (jobMode === "file" && jobDescriptionFile) {
        formData.append("job_description_file", jobDescriptionFile);
      } else if (jobMode === "link") {
        formData.append("job_description_url", jobDescriptionUrl.trim());
      }
      formData.append("location", location);

      const response = await fetch(`${API}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Analysis failed. Please try again.");
      }

      const data = await response.json();
      window.clearInterval(timer);

      sessionStorage.setItem("analysisResult", JSON.stringify(data));
      sessionStorage.setItem("jobDescription", data.job_description_text || jobDescription);
      sessionStorage.setItem(
        "jobDescriptionSourceLabel",
        data.job_description_source_label ||
          (jobMode === "file"
            ? jobDescriptionFile?.name || "Uploaded JD"
            : jobMode === "link"
              ? getDomainLabel(jobDescriptionUrl)
              : "Pasted job description")
      );
      await persistToMemory(data as Record<string, unknown>, data.job_description_text || jobDescription);

      router.push("/dashboard");
    } catch (submitError: unknown) {
      window.clearInterval(timer);
      setStep("idle");
      setLoading(false);
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Is the backend running?");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
      <div className="orb orb-1" style={{ top: "-220px", right: "-120px", opacity: 0.5 }} />
      <div className="orb orb-2" style={{ bottom: "2%", left: "-120px", opacity: 0.5 }} />
      <div className="orb orb-3" style={{ top: "18%", left: "12%", opacity: 0.35 }} />

      <nav className="nav-blur" style={{ position: "fixed", inset: "0 0 auto 0", zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              AI
            </div>
            <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: "1.02rem" }}>
              Career<span className="gradient-text">Copilot</span>
            </span>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth" className="btn-secondary" style={{ padding: "10px 16px", fontSize: "0.84rem", textDecoration: "none" }}>
              Account
            </Link>
            <Link href="/" className="btn-secondary" style={{ padding: "10px 16px", fontSize: "0.84rem", textDecoration: "none" }}>
              Home
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "112px 24px 80px", position: "relative", zIndex: 1 }}>
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: "28px clamp(22px, 4vw, 40px)",
            marginBottom: 26,
            background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--accent-cyan)", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
                Role-fit workspace
              </div>
              <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", lineHeight: 1.05, marginBottom: 12 }}>
                Analyze Your <span className="gradient-text">Career Fit</span>
              </h1>
              <p style={{ color: "var(--text-secondary)", maxWidth: 620, lineHeight: 1.7, fontSize: "1rem" }}>
                Add your resume, then choose how you want to bring in the job description: paste it, upload the JD file, or drop in a LinkedIn or careers link.
              </p>
            </div>

            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(6, 10, 24, 0.72)",
                padding: 22,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ fontWeight: 700 }}>What you can use now</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Resume: PDF, DOCX, or pasted text",
                  "Job description: text, TXT/PDF/DOCX, LinkedIn link, or any careers page",
                  "Dashboard: interview prep, study roadmap, recruiter read, and ATS rewrite",
                  "NEW: Target location benchmarks",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--accent-cyan)" }}>+</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }} className="animate-fade-in-up delay-100">
          <div className="glass-card" style={{ padding: 24, display: "grid", gap: 18 }}>
            <div>
              <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: 8 }}>
                Candidate profile
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Your resume</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Upload your latest resume or paste the raw text if you want to test quickly.
              </p>
            </div>

            <SourceToggle
              value={resumeMode}
              onChange={(next) => {
                setResumeMode(next);
                setError("");
              }}
              options={[
                { id: "file", label: "Upload resume", hint: "Best for PDF or DOCX files" },
                { id: "text", label: "Paste text", hint: "Useful when you want a fast test run" },
              ]}
            />

            {resumeMode === "file" ? (
              <div
                className={`drop-zone ${activeDropTarget === "resume" ? "active" : ""}`}
                style={{ padding: "28px 20px", minHeight: 210, display: "grid", gap: 14, placeItems: "center", textAlign: "center" }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setActiveDropTarget("resume");
                }}
                onDragLeave={() => setActiveDropTarget(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop("resume", event.dataTransfer.files?.[0]);
                }}
                onClick={() => resumeInputRef.current?.click()}
              >
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: "none" }}
                  onChange={(event) => handleDrop("resume", event.target.files?.[0])}
                />
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{resumeFile ? "Resume ready" : "Drop your resume here"}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {resumeFile ? supportedResumeHint : "Click to browse or drag a PDF / DOCX file into this card."}
                </div>
                <div className="chip chip-indigo">{supportedResumeHint}</div>
              </div>
            ) : (
              <textarea
                className="input-glass"
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                style={{ minHeight: 230, resize: "vertical", lineHeight: 1.65 }}
              />
            )}
          </div>

          <div className="glass-card" style={{ padding: 24, display: "grid", gap: 18 }}>
            <div>
              <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: 8 }}>
                Target role input
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Job description</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Choose the source that matches how you found the role. LinkedIn links and uploaded JD files are supported now.
              </p>
            </div>

            <SourceToggle
              value={jobMode}
              onChange={(next) => {
                setJobMode(next);
                setError("");
              }}
              options={[
                { id: "text", label: "Paste JD", hint: "Good for quick copy-paste from any site" },
                { id: "file", label: "Upload JD file", hint: "TXT, PDF, DOCX, or Markdown" },
                { id: "link", label: "Use job link", hint: "LinkedIn, careers page, or any public URL" },
              ]}
            />

            {jobMode === "text" ? (
              <textarea
                className="input-glass"
                placeholder="Paste the full JD here from LinkedIn, Indeed, or the company careers page..."
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                style={{ minHeight: 230, resize: "vertical", lineHeight: 1.65 }}
              />
            ) : null}

            {jobMode === "file" ? (
              <div
                className={`drop-zone ${activeDropTarget === "job" ? "active" : ""}`}
                style={{ padding: "28px 20px", minHeight: 210, display: "grid", gap: 14, placeItems: "center", textAlign: "center" }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setActiveDropTarget("job");
                }}
                onDragLeave={() => setActiveDropTarget(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop("job", event.dataTransfer.files?.[0]);
                }}
                onClick={() => jobInputRef.current?.click()}
              >
                <input
                  ref={jobInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: "none" }}
                  onChange={(event) => handleDrop("job", event.target.files?.[0])}
                />
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{jobDescriptionFile ? "JD file ready" : "Drop the job description file here"}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {jobDescriptionFile ? supportedJobHint : "Click to browse or drag a TXT, PDF, or DOCX JD file into this card."}
                </div>
                <div className="chip chip-cyan">{supportedJobHint}</div>
              </div>
            ) : null}

            {jobMode === "link" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  className="input-glass"
                  type="url"
                  placeholder="https://www.linkedin.com/jobs/view/... or any careers page"
                  value={jobDescriptionUrl}
                  onChange={(event) => setJobDescriptionUrl(event.target.value)}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["LinkedIn", "Indeed", "Company careers page"].map((label) => (
                    <span key={label} className="chip chip-cyan">
                      {label}
                    </span>
                  ))}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6 }}>
                  Add the public job link and the backend will try to extract the JD text automatically.
                </div>
              </div>
            ) : null}

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                padding: 16,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>Current JD source</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>{supportedJobHint}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24, display: "grid", gap: 18 }}>
            <div>
              <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.12em", marginBottom: 8 }}>
                Target Context
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Localized Insights</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Specify where the job is located to get relevant salary and market intelligence.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Job Location</div>
              <input
                className="input-glass"
                type="text"
                placeholder="e.g. India, USA, Remote, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Defaults to India. Change this to USA, Europe, etc. for accurate compensation data in the dashboard.
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                borderRadius: 16,
                border: "1px solid rgba(14,165,233,0.15)",
                background: "linear-gradient(135deg, rgba(14,165,233,0.05), rgba(99,102,241,0.05))",
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--accent-cyan)", fontSize: "0.88rem", marginBottom: 6 }}>Pro Tip</div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Adding a specific city (e.g. "San Francisco" or "Bangalore") provides even more granular salary benchmarks.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid rgba(244,63,94,0.24)",
              background: "rgba(244,63,94,0.10)",
              color: "#fda4af",
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-card animate-fade-in" style={{ marginTop: 24, padding: "24px 26px" }}>
            <div style={{ display: "grid", gap: 14 }}>
              {LOADING_STEPS.map((item) => {
                const order = ["parsing", "matching", "analyzing", "done"];
                const currentIndex = order.indexOf(step);
                const itemIndex = order.indexOf(item.key);
                const isActive = item.key === step;
                const isDone = itemIndex < currentIndex;
                return (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: itemIndex <= currentIndex ? 1 : 0.35,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        border: isDone
                          ? "1px solid rgba(16,185,129,0.4)"
                          : isActive
                            ? "1px solid rgba(34,211,238,0.4)"
                            : "1px solid var(--border-subtle)",
                        background: isDone
                          ? "rgba(16,185,129,0.12)"
                          : isActive
                            ? "rgba(34,211,238,0.08)"
                            : "rgba(255,255,255,0.02)",
                      }}
                    >
                      {isDone ? "OK" : isActive ? <div className="spinner" /> : item.key.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontSize: "0.92rem" }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {!loading ? (
          <div style={{ display: "grid", justifyContent: "center", marginTop: 28 }} className="animate-fade-in-up delay-200">
            <button className="btn-primary" type="button" onClick={handleSubmit} style={{ padding: "18px 58px", fontSize: "1.02rem" }}>
              Analyze My Career Fit
            </button>
          </div>
        ) : null}

        <p style={{ textAlign: "center", marginTop: 20, color: "var(--text-muted)", fontSize: "0.82rem" }}>
          Your files are processed in memory for the analysis flow and are not stored permanently.
        </p>
      </div>
    </div>
  );
}

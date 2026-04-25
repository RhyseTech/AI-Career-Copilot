"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab =
  | "overview"
  | "gaps"
  | "resume"
  | "interview"
  | "roadmap"
  | "salary"
  | "linkedin"
  | "recruiter";

interface SkillGap {
  skill: string;
  priority: string;
  reason: string;
  how_to_learn?: string;
  time_estimate?: string;
}

interface AnalysisResult {
  match_score: number;
  resume_text: string;
  job_description_text?: string;
  job_description_source?: string;
  job_description_source_label?: string;
  parsed_skills: string[];
  parsed_experience: string[];
  jd_required_skills: string[];
  jd_seniority: string;
  skill_gaps: SkillGap[];
  matched_skills: string[];
  experience_gaps: string[];
  summary: string;
  quick_wins?: string[];
  blind_spots?: string[];
  confidence_score?: { overall?: number; label?: string; dimensions?: Record<string, number> };
  ats_score?: {
    overall_score?: number;
    section_score?: number;
    keyword_score?: number;
    formatting_score?: number;
    impact_score?: number;
  };
  impact_score?: { score?: number; assessment?: string; suggestions?: string[] };
  career_arc?: { arc_type?: string; arc_description?: string; years_of_experience?: number };
  jd_parsed?: { role_title?: string; industry?: string; years_of_experience?: string; tools?: string[] };
}

interface InterviewQuestion {
  category: string;
  focus_area?: string;
  difficulty?: string;
  question: string;
  ideal_answer: string;
  coaching_tip?: string;
}

interface RoadmapTopic {
  topic: string;
  priority?: string;
  why_it_matters?: string;
  estimated_time?: string;
  study_actions?: string[];
  practice_task?: string;
  google_link?: string;
  youtube_link?: string;
}

interface RoadmapWeek {
  week: string;
  focus: string;
  actions?: string[];
  resources?: string[];
}

interface RoadmapResponse {
  headline?: string;
  study_plan?: RoadmapTopic[];
  thirty_day_plan?: RoadmapWeek[];
  sixty_day_plan?: RoadmapWeek[];
  certifications?: string[];
  projects?: string[];
}

interface RecruiterResponse {
  recruiter_verdict?: string;
  verdict_reasoning?: string;
  first_impression?: string;
  skip_reasons?: { reason: string; fix: string }[];
  strengths_noticed?: string[];
  pile_position?: { estimated_rank?: string; explanation?: string };
  shortlist_fixes?: string[];
  ats_pass_prediction?: boolean | null;
  interview_likelihood_pct?: number;
  generated_at?: string;
  live_market_data_available?: boolean;
  market_data_note?: string;
  mock_interview_focus?: string[];
}

interface OptimizeResponseData {
  optimized_resume?: string;
  key_changes?: string[];
  ats_score_estimate?: number;
  download_resume?: DownloadResume | null;
}

interface SalaryResponse {
  salary_range?: {
    low?: string;
    median?: string;
    high?: string;
  };
  factors_affecting_pay?: string[];
  negotiation_script?: Record<string, string>;
}

interface LinkedinResponse {
  profile_score_before?: number;
  profile_score_after?: number;
  optimized_headline?: string;
  optimized_about?: string;
  skills_to_add?: string[];
  skills_to_remove?: string[];
  skills_to_prioritize?: string[];
}

interface DownloadResumeExperience {
  role_title?: string;
  company?: string;
  location?: string;
  date_range?: string;
  bullets?: string[];
}

interface DownloadResumeProject {
  name?: string;
  subtitle?: string;
  bullets?: string[];
}

interface DownloadResumeSection {
  title?: string;
  items?: string[];
}

interface DownloadResume {
  full_name?: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  core_skills?: string[];
  experience?: DownloadResumeExperience[];
  projects?: DownloadResumeProject[];
  education?: string[];
  certifications?: string[];
  additional_sections?: DownloadResumeSection[];
}

function sanitizeFileName(value: string) {
  return (value || "ats-resume")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "ats-resume";
}

function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildResumeText(layout: DownloadResume, optimizedResume: string) {
  const contactParts = [layout.location, layout.email, layout.phone, layout.linkedin, layout.portfolio].filter(Boolean);
  const lines: string[] = [];

  if (layout.full_name) lines.push(layout.full_name.toUpperCase());
  if (layout.headline) lines.push(layout.headline);
  if (contactParts.length) lines.push(contactParts.join(" | "));
  if (lines.length) lines.push("");

  if (layout.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(layout.summary);
    lines.push("");
  }

  if (layout.core_skills?.length) {
    lines.push("CORE SKILLS");
    lines.push(layout.core_skills.join(" | "));
    lines.push("");
  }

  if (layout.experience?.length) {
    lines.push("PROFESSIONAL EXPERIENCE");
    layout.experience.forEach((item) => {
      const headerLeft = [item.role_title, item.company].filter(Boolean).join(" | ");
      const headerRight = [item.location, item.date_range].filter(Boolean).join(" | ");
      if (headerLeft || headerRight) lines.push([headerLeft, headerRight].filter(Boolean).join("    "));
      (item.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
      lines.push("");
    });
  }

  if (layout.projects?.length) {
    lines.push("PROJECTS");
    layout.projects.forEach((project) => {
      const title = [project.name, project.subtitle].filter(Boolean).join(" | ");
      if (title) lines.push(title);
      (project.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
      lines.push("");
    });
  }

  if (layout.education?.length) {
    lines.push("EDUCATION");
    layout.education.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }

  if (layout.certifications?.length) {
    lines.push("CERTIFICATIONS");
    layout.certifications.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  }

  (layout.additional_sections || []).forEach((section) => {
    if (!section.title || !section.items?.length) return;
    lines.push(section.title.toUpperCase());
    section.items.forEach((entry) => lines.push(`- ${entry}`));
    lines.push("");
  });

  if (lines.filter(Boolean).length <= 3 && optimizedResume) return optimizedResume;
  return lines.join("\n").trim();
}

async function downloadResumePdf(layout: DownloadResume, optimizedResume: string, targetRole: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed = 22) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size = 10.5, color = "#243040", gap = 15) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * gap + 4);
    doc.text(lines, margin, y);
    y += lines.length * gap;
  };

  const writeSection = (title: string) => {
    ensureSpace(30);
    y += 10;
    doc.setDrawColor(220, 226, 232);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    doc.text(title.toUpperCase(), margin, y);
    y += 14;
  };

  const name = layout.full_name || "Candidate Name";
  const headline = layout.headline || targetRole || "ATS-Friendly Resume";
  const contactLine = [layout.location, layout.email, layout.phone, layout.linkedin, layout.portfolio].filter(Boolean).join("  |  ");

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#0f172a");
  doc.text(name, margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#475569");
  doc.text(headline, margin, y);
  y += 16;

  if (contactLine) writeWrapped(contactLine, 9.5, "#64748b", 13);
  if (layout.summary) {
    writeSection("Professional Summary");
    writeWrapped(layout.summary, 10.5, "#243040", 15);
  }
  if (layout.core_skills?.length) {
    writeSection("Core Skills");
    writeWrapped(layout.core_skills.join(" | "), 10.5, "#243040", 15);
  }

  if (layout.experience?.length) {
    writeSection("Professional Experience");
    layout.experience.forEach((entry) => {
      const titleLine = [entry.role_title, entry.company].filter(Boolean).join(" | ");
      const metaLine = [entry.location, entry.date_range].filter(Boolean).join(" | ");
      if (titleLine) {
        ensureSpace(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor("#0f172a");
        doc.text(titleLine, margin, y);
        y += 14;
      }
      if (metaLine) writeWrapped(metaLine, 9.5, "#64748b", 13);
      (entry.bullets || []).forEach((bullet) => {
        const lines = doc.splitTextToSize(`- ${bullet}`, contentWidth - 10);
        ensureSpace(lines.length * 14 + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.2);
        doc.setTextColor("#243040");
        doc.text(lines, margin + 8, y);
        y += lines.length * 14;
      });
      y += 4;
    });
  }

  if (layout.projects?.length) {
    writeSection("Projects");
    layout.projects.forEach((project) => {
      const titleLine = [project.name, project.subtitle].filter(Boolean).join(" | ");
      if (titleLine) {
        ensureSpace(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor("#0f172a");
        doc.text(titleLine, margin, y);
        y += 14;
      }
      (project.bullets || []).forEach((bullet) => {
        const lines = doc.splitTextToSize(`- ${bullet}`, contentWidth - 10);
        ensureSpace(lines.length * 14 + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.2);
        doc.setTextColor("#243040");
        doc.text(lines, margin + 8, y);
        y += lines.length * 14;
      });
      y += 4;
    });
  }

  if (layout.education?.length) {
    writeSection("Education");
    layout.education.forEach((entry) => writeWrapped(`- ${entry}`, 10.2, "#243040", 14));
  }
  if (layout.certifications?.length) {
    writeSection("Certifications");
    layout.certifications.forEach((entry) => writeWrapped(`- ${entry}`, 10.2, "#243040", 14));
  }

  (layout.additional_sections || []).forEach((section) => {
    if (!section.title || !section.items?.length) return;
    writeSection(section.title);
    section.items.forEach((entry) => writeWrapped(`- ${entry}`, 10.2, "#243040", 14));
  });

  if (!layout.summary && !layout.experience?.length && optimizedResume) {
    writeSection("Optimized Resume");
    writeWrapped(optimizedResume, 10.2, "#243040", 14);
  }

  doc.save(`${sanitizeFileName(name || targetRole || "ats-resume")}-ats-resume.pdf`);
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Request failed.");
  return payload as T;
}

function mergeInterviewQuestions(current: InterviewQuestion[], incoming: InterviewQuestion[]) {
  const seen = new Set<string>();
  const merged: InterviewQuestion[] = [];
  [...current, ...incoming].forEach((item) => {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

function formatLabel(value: string | undefined) {
  return String(value || "unknown").replace(/_/g, " ");
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 132 132" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 12px ${color}50)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color }}>{Math.round(score)}%</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>match</div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{title}</h2>
      {subtitle ? <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: 6, lineHeight: 1.6 }}>{subtitle}</p> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  tone?: "indigo" | "green" | "amber" | "rose" | "cyan";
}) {
  const colorMap = {
    indigo: "var(--accent-indigo)",
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    rose: "var(--accent-rose)",
    cyan: "var(--accent-cyan)",
  };

  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: colorMap[tone] }}>{value}</div>
    </div>
  );
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 14 }}>{title}</h3>
      {items.length ? (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`} style={{ color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.65, display: "flex", gap: 10 }}>
              <span style={{ color: "var(--accent-indigo)", flexShrink: 0 }}>-&gt;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: "0.87rem" }}>{empty}</p>
      )}
    </div>
  );
}

function AlertCard({ message }: { message: string }) {
  return (
    <div className="glass-card" style={{ padding: 18, border: "1px solid rgba(244,63,94,0.24)", background: "rgba(244,63,94,0.08)" }}>
      <p style={{ color: "#fda4af", fontSize: "0.9rem", lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

function InterviewCard({ item, index }: { item: InterviewQuestion; index: number }) {
  const [open, setOpen] = useState(index < 3);
  const tone =
    item.category === "behavioral"
      ? "chip-amber"
      : item.category === "situational"
        ? "chip-cyan"
        : "chip-indigo";

  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%",
          padding: "18px 20px",
          display: "flex",
          gap: 14,
          background: "transparent",
          border: "none",
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.78rem", marginTop: 4 }}>Q{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <span className={`chip ${tone}`} style={{ textTransform: "capitalize" }}>{item.category}</span>
            {item.focus_area ? <span className="chip chip-cyan">{item.focus_area}</span> : null}
            {item.difficulty ? <span className="chip chip-amber" style={{ textTransform: "capitalize" }}>{item.difficulty}</span> : null}
          </div>
          <div style={{ fontSize: "0.94rem", lineHeight: 1.65 }}>{item.question}</div>
        </div>
      </button>

      {open ? (
        <div style={{ padding: "0 20px 18px 54px", display: "grid", gap: 12 }}>
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Ideal answer</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{item.ideal_answer}</div>
          </div>
          {item.coaching_tip ? (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-primary)" }}>Coach note:</strong> {item.coaching_tip}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RoadmapTopicCard({ item }: { item: RoadmapTopic }) {
  return (
    <div className="glass-card" style={{ padding: 22, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>{item.topic}</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.65 }}>{item.why_it_matters}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.priority ? <span className={`chip ${item.priority === "high" ? "chip-rose" : item.priority === "medium" ? "chip-amber" : "chip-cyan"}`}>{item.priority} priority</span> : null}
          {item.estimated_time ? <span className="chip chip-indigo">{item.estimated_time}</span> : null}
        </div>
      </div>

      {(item.study_actions || []).length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {(item.study_actions || []).map((action, index) => (
            <div key={`${item.topic}-${index}`} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6 }}>
              <span style={{ color: "var(--accent-cyan)" }}>+</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      ) : null}

      {item.practice_task ? (
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Practice task</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6 }}>{item.practice_task}</div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {item.google_link ? (
          <a href={item.google_link} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: "10px 14px", fontSize: "0.84rem", textDecoration: "none" }}>
            Google search
          </a>
        ) : null}
        {item.youtube_link ? (
          <a href={item.youtube_link} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: "10px 14px", fontSize: "0.84rem", textDecoration: "none" }}>
            YouTube videos
          </a>
        ) : null}
      </div>
    </div>
  );
}

function WeekPlanCard({ title, items }: { title: string; items: RoadmapWeek[] }) {
  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>{title}</h3>
      {items.length ? (
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((item, index) => (
            <div key={`${title}-${index}`} style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)", paddingTop: index === 0 ? 0 : 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{item.week}</div>
                <span className="chip chip-indigo">{item.focus}</span>
              </div>
              {(item.actions || []).map((action, actionIndex) => (
                <div key={actionIndex} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6, marginTop: 6 }}>
                  <span style={{ color: "var(--accent-indigo)" }}>-&gt;</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: "0.87rem" }}>No weekly plan was generated.</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionSourceLabel, setJobDescriptionSourceLabel] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [optimizedResume, setOptimizedResume] = useState("");
  const [keyChanges, setKeyChanges] = useState<string[]>([]);
  const [resumeAtsScore, setResumeAtsScore] = useState(0);
  const [downloadResume, setDownloadResume] = useState<DownloadResume | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewLastBatchSize, setInterviewLastBatchSize] = useState(0);
  const [interviewLoadingMore, setInterviewLoadingMore] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [salary, setSalary] = useState<SalaryResponse | null>(null);
  const [linkedin, setLinkedin] = useState<LinkedinResponse | null>(null);
  const [recruiter, setRecruiter] = useState<RecruiterResponse | null>(null);
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);
  const [tabErrors, setTabErrors] = useState<Partial<Record<Tab, string>>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("analysisResult");
    const storedJd = sessionStorage.getItem("jobDescription");
    const storedSourceLabel = sessionStorage.getItem("jobDescriptionSourceLabel");
    if (!stored) {
      router.push("/analyze");
      return;
    }
    const parsed = JSON.parse(stored) as AnalysisResult;
    setResult(parsed);
    setJobDescription(storedJd || parsed.job_description_text || "");
    setJobDescriptionSourceLabel(storedSourceLabel || parsed.job_description_source_label || "");
  }, [router]);

  async function loadResumeOptimization(data: AnalysisResult) {
    if (optimizedResume) return;
    setLoadingTab("resume");
    setTabErrors((prev) => ({ ...prev, resume: undefined }));
    try {
      const payload = await fetchJson<OptimizeResponseData>(`${API}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: data.resume_text, job_description: jobDescription }),
      });
      setOptimizedResume(payload.optimized_resume || "");
      setKeyChanges(payload.key_changes || []);
      setResumeAtsScore(payload.ats_score_estimate || 0);
      setDownloadResume(payload.download_resume || null);
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, resume: error instanceof Error ? error.message : "Unable to optimize resume." }));
    } finally {
      setLoadingTab(null);
    }
  }

  async function loadInterview(data: AnalysisResult, append = false) {
    if (!append && interviewQuestions.length) return;
    if (append) {
      setInterviewLoadingMore(true);
    } else {
      setLoadingTab("interview");
    }
    setTabErrors((prev) => ({ ...prev, interview: undefined }));
    try {
      const payload = await fetchJson<{ questions?: InterviewQuestion[] }>(`${API}/api/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: data.resume_text,
          job_description: jobDescription,
          skill_gaps: data.skill_gaps.map((gap) => gap.skill),
          requested_count: append ? 8 : 18,
          exclude_questions: append ? interviewQuestions.map((question) => question.question) : [],
        }),
      });

      const incoming = payload.questions || [];
      setInterviewLastBatchSize(append ? incoming.length : 0);
      setInterviewQuestions((current) => (append ? mergeInterviewQuestions(current, incoming) : incoming));
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, interview: error instanceof Error ? error.message : "Unable to generate interview prep." }));
    } finally {
      setLoadingTab((current) => (current === "interview" ? null : current));
      setInterviewLoadingMore(false);
    }
  }

  async function loadRoadmap(data: AnalysisResult) {
    if (roadmap) return;
    setLoadingTab("roadmap");
    setTabErrors((prev) => ({ ...prev, roadmap: undefined }));
    try {
      const payload = await fetchJson<RoadmapResponse>(`${API}/api/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_gaps: data.skill_gaps.map((gap) => gap.skill),
          current_role: data.career_arc?.arc_type || "",
          target_role: data.jd_parsed?.role_title || "",
        }),
      });
      setRoadmap(payload);
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, roadmap: error instanceof Error ? error.message : "Unable to build study plan." }));
    } finally {
      setLoadingTab(null);
    }
  }

  async function loadSalary(data: AnalysisResult) {
    if (salary) return;
    setLoadingTab("salary");
    setTabErrors((prev) => ({ ...prev, salary: undefined }));
    try {
      const payload = await fetchJson<SalaryResponse>(`${API}/api/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_title: data.jd_parsed?.role_title || "Target role",
          location: "India",
          seniority: data.jd_seniority || "mid",
          years_experience: data.jd_parsed?.years_of_experience || "5-8",
          key_skills: data.jd_required_skills.slice(0, 10),
        }),
      });
      setSalary(payload);
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, salary: error instanceof Error ? error.message : "Unable to load salary insight." }));
    } finally {
      setLoadingTab(null);
    }
  }

  async function loadLinkedin(data: AnalysisResult) {
    if (linkedin) return;
    setLoadingTab("linkedin");
    setTabErrors((prev) => ({ ...prev, linkedin: undefined }));
    try {
      const payload = await fetchJson<LinkedinResponse>(`${API}/api/linkedin-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_headline: data.jd_parsed?.role_title ? `Targeting ${data.jd_parsed.role_title}` : "Career candidate",
          current_about: data.summary,
          current_skills: data.parsed_skills.join(", "),
          target_role: data.jd_parsed?.role_title || "Target role",
          key_skills: data.jd_required_skills.slice(0, 12),
        }),
      });
      setLinkedin(payload);
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, linkedin: error instanceof Error ? error.message : "Unable to generate LinkedIn recommendations." }));
    } finally {
      setLoadingTab(null);
    }
  }

  async function loadRecruiter(data: AnalysisResult) {
    if (recruiter) return;
    setLoadingTab("recruiter");
    setTabErrors((prev) => ({ ...prev, recruiter: undefined }));
    try {
      const payload = await fetchJson<RecruiterResponse>(`${API}/api/recruiter-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: data.resume_text,
          jd_text: jobDescription,
          match_score: data.match_score,
        }),
      });
      setRecruiter(payload);
    } catch (error) {
      setTabErrors((prev) => ({ ...prev, recruiter: error instanceof Error ? error.message : "Unable to run recruiter simulation." }));
    } finally {
      setLoadingTab(null);
    }
  }

  function handleTabChange(tab: Tab) {
    if (!result) return;
    setActiveTab(tab);
    if (tab === "resume") void loadResumeOptimization(result);
    if (tab === "interview") void loadInterview(result);
    if (tab === "roadmap") void loadRoadmap(result);
    if (tab === "salary") void loadSalary(result);
    if (tab === "linkedin") void loadLinkedin(result);
    if (tab === "recruiter") void loadRecruiter(result);
  }

  if (!result) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  const interviewStats = {
    total: interviewQuestions.length,
    technical: interviewQuestions.filter((item) => item.category === "technical").length,
    behavioral: interviewQuestions.filter((item) => item.category === "behavioral").length,
    situational: interviewQuestions.filter((item) => item.category === "situational").length,
  };

  const mockFocusFromInterview = interviewQuestions
    .slice(0, 4)
    .map((item) => item.focus_area)
    .filter((value): value is string => Boolean(value));

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "gaps", label: "Skill Gaps" },
    { id: "resume", label: "Resume" },
    { id: "interview", label: "Interview" },
    { id: "roadmap", label: "Study Plan" },
    { id: "salary", label: "Salary" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "recruiter", label: "Mock / Recruiter" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative" }}>
      <div className="orb orb-1" style={{ top: "-240px", right: "-180px", opacity: 0.55 }} />
      <div className="orb orb-2" style={{ bottom: "8%", left: "-120px", opacity: 0.45 }} />
      <div className="orb orb-3" style={{ top: "22%", left: "12%", opacity: 0.3 }} />

      <nav className="nav-blur" style={{ position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "grid", placeItems: "center", fontWeight: 700 }}>AI</div>
            <span style={{ fontFamily: "var(--font-space)", fontWeight: 700 }}>
              Career<span className="gradient-text">Copilot</span>
            </span>
          </Link>
          <Link href="/analyze" className="btn-secondary" style={{ padding: "9px 18px", fontSize: "0.82rem", textDecoration: "none" }}>
            New analysis
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 80px", position: "relative", zIndex: 1 }}>
        <div className="glass-card" style={{ padding: "28px clamp(22px, 4vw, 34px)", marginBottom: 22, background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 26, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ScoreRing score={result.match_score} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Target dashboard</div>
                <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: 10 }}>
                  {result.jd_parsed?.role_title || "Career analysis"} dashboard
                </h1>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, fontSize: "0.94rem" }}>{result.summary}</p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="chip chip-green">{result.matched_skills.length} matched skills</span>
                <span className="chip chip-rose">{result.skill_gaps.length} gaps to close</span>
                <span className="chip chip-indigo">{result.jd_seniority} level</span>
                {result.jd_parsed?.industry ? <span className="chip chip-cyan">{result.jd_parsed.industry}</span> : null}
                {jobDescriptionSourceLabel ? <span className="chip chip-cyan">{jobDescriptionSourceLabel}</span> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                <StatCard label="Confidence" value={`${result.confidence_score?.overall || 0}%`} tone="green" />
                <StatCard label="ATS" value={`${result.ats_score?.overall_score || 0}%`} tone="indigo" />
                <StatCard label="Experience" value={`${result.career_arc?.years_of_experience || 0} yrs`} tone="cyan" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => handleTabChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <StatCard label="Confidence" value={`${result.confidence_score?.overall || 0}%`} tone="green" />
              <StatCard label="ATS Score" value={`${result.ats_score?.overall_score || 0}%`} tone="indigo" />
              <StatCard label="Impact Score" value={`${result.impact_score?.score || 0}%`} tone="amber" />
              <StatCard label="Experience" value={`${result.career_arc?.years_of_experience || 0} yrs`} tone="cyan" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div className="glass-card" style={{ padding: 24 }}>
                <SectionTitle title="Role alignment" subtitle="Signals already working in your favor" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {result.matched_skills.map((skill) => (
                    <span key={skill} className="chip chip-green">{skill}</span>
                  ))}
                </div>
                <ListCard title="Quick wins" items={result.quick_wins || []} empty="No quick wins were generated for this run." />
              </div>

              <div style={{ display: "grid", gap: 20 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                  <SectionTitle title="Career arc" subtitle={formatLabel(result.career_arc?.arc_type)} />
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                    {result.career_arc?.arc_description || "Career trajectory analysis unavailable."}
                  </p>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                  <SectionTitle title="Blind spots" subtitle="What the resume is not proving yet" />
                  {result.blind_spots?.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {result.blind_spots.map((item, index) => (
                        <div key={index} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.65 }}>
                          <span style={{ color: "var(--accent-rose)" }}>+</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.87rem" }}>No major blind spots detected.</p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <ListCard title="Resume highlights" items={result.parsed_experience.slice(0, 6)} empty="No strong bullet points were extracted." />
              <div className="glass-card" style={{ padding: 22 }}>
                <SectionTitle title="ATS breakdown" subtitle="How the parser sees your resume structure" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                  <StatCard label="Sections" value={`${result.ats_score?.section_score || 0}%`} tone="indigo" />
                  <StatCard label="Keywords" value={`${result.ats_score?.keyword_score || 0}%`} tone="green" />
                  <StatCard label="Formatting" value={`${result.ats_score?.formatting_score || 0}%`} tone="amber" />
                  <StatCard label="Impact" value={`${result.ats_score?.impact_score || 0}%`} tone="cyan" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "gaps" ? (
          <div style={{ display: "grid", gap: 18 }}>
            <SectionTitle title="Skill gap analysis" subtitle="Ranked by importance against the target role" />
            {result.skill_gaps.length ? (
              result.skill_gaps.map((gap, index) => (
                <div key={`${gap.skill}-${index}`} className="glass-card" style={{ padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{gap.skill}</h3>
                    <span className={`chip ${gap.priority === "high" ? "chip-rose" : gap.priority === "medium" ? "chip-amber" : "chip-cyan"}`}>{gap.priority} priority</span>
                    {gap.time_estimate ? <span className="chip chip-indigo">{gap.time_estimate}</span> : null}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>{gap.reason}</p>
                  {gap.how_to_learn ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.6, marginTop: 10 }}>
                      <strong style={{ color: "var(--text-primary)" }}>How to close it:</strong> {gap.how_to_learn}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="glass-card" style={{ padding: 28 }}>
                <p style={{ color: "var(--text-secondary)" }}>No major skill gaps detected for this role.</p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <ListCard title="Experience gaps" items={result.experience_gaps} empty="No experience gaps were highlighted." />
              <ListCard title="Impact suggestions" items={result.impact_score?.suggestions || []} empty="No extra impact suggestions were generated." />
            </div>
          </div>
        ) : null}

        {activeTab === "resume" ? (
          <div className="glass-card" style={{ padding: 24 }}>
            <SectionTitle title="Resume optimizer" subtitle="ATS-targeted rewrite based on the selected job description" />
            {tabErrors.resume ? <AlertCard message={tabErrors.resume} /> : null}
            {loadingTab === "resume" ? <div className="spinner" /> : null}
            {optimizedResume ? (
              <div style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                  <StatCard label="Estimated ATS" value={`${resumeAtsScore}%`} tone="green" />
                  <StatCard label="Changes applied" value={keyChanges.length} tone="indigo" />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {keyChanges.map((change, index) => (
                    <span key={index} className="chip chip-indigo">{change}</span>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-primary" style={{ padding: "10px 16px", fontSize: "0.84rem" }} onClick={() => downloadResumePdf(downloadResume || {}, optimizedResume, result.jd_parsed?.role_title || "Resume")}>
                    Download ATS PDF
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "10px 16px", fontSize: "0.84rem" }}
                    onClick={() =>
                      downloadTextFile(
                        buildResumeText(downloadResume || {}, optimizedResume),
                        `${sanitizeFileName(downloadResume?.full_name || result.jd_parsed?.role_title || "ats-resume")}-ats-resume.txt`
                      )
                    }
                  >
                    Download ATS Text
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "10px 16px", fontSize: "0.84rem" }}
                    onClick={() => navigator.clipboard.writeText(buildResumeText(downloadResume || {}, optimizedResume))}
                  >
                    Copy ATS Resume
                  </button>
                </div>

                {downloadResume ? (
                  <div className="glass-card" style={{ padding: 20, background: "rgba(255,255,255,0.02)" }}>
                    <SectionTitle title="Download-ready ATS layout" subtitle="Single-column format with clearer keyword placement and stronger section order" />
                    <div style={{ display: "grid", gap: 12 }}>
                      {downloadResume.full_name ? <div><strong>{downloadResume.full_name}</strong>{downloadResume.headline ? ` - ${downloadResume.headline}` : ""}</div> : null}
                      {downloadResume.summary ? <p style={{ color: "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.7 }}>{downloadResume.summary}</p> : null}
                      {downloadResume.core_skills?.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {downloadResume.core_skills.slice(0, 12).map((skill, index) => (
                            <span key={index} className="chip chip-cyan">{skill}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.86rem", lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>{optimizedResume}</pre>
              </div>
            ) : loadingTab !== "resume" ? (
              <p style={{ color: "var(--text-muted)" }}>Open this tab to generate the optimized resume.</p>
            ) : null}
          </div>
        ) : null}

        {activeTab === "interview" ? (
          <div style={{ display: "grid", gap: 18 }}>
            <SectionTitle title="Interview question bank" subtitle="Start with 18 tailored questions, then generate more relevant follow-up questions whenever you need them." />
            {tabErrors.interview ? <AlertCard message={tabErrors.interview} /> : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
              <StatCard label="Questions ready" value={interviewStats.total} tone="green" />
              <StatCard label="Technical" value={interviewStats.technical} tone="indigo" />
              <StatCard label="Behavioral" value={interviewStats.behavioral} tone="amber" />
              <StatCard label="Situational" value={interviewStats.situational} tone="cyan" />
            </div>

            {loadingTab === "interview" ? (
              <div className="glass-card" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : interviewQuestions.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {interviewQuestions.map((item, index) => (
                  <InterviewCard key={`${item.question}-${index}`} item={item} index={index} />
                ))}

                <div className="glass-card" style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Need more practice?</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                      Generate more role-aware interview questions based on your current gaps and the questions already shown.
                    </div>
                  </div>
                  <button className="btn-primary" type="button" style={{ padding: "12px 18px", fontSize: "0.88rem" }} onClick={() => void loadInterview(result, true)} disabled={interviewLoadingMore}>
                    {interviewLoadingMore ? "Generating..." : "Add more questions"}
                  </button>
                </div>

                {interviewLastBatchSize > 0 && interviewLoadingMore === false ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    Last batch added {interviewLastBatchSize} more questions.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ color: "var(--text-muted)" }}>Open this tab to generate interview questions.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "roadmap" ? (
          <div style={{ display: "grid", gap: 20 }}>
            <SectionTitle title="What to study next" subtitle="A clearer study plan based on your role target, gaps, and the order that will help you most in interviews." />
            {tabErrors.roadmap ? <AlertCard message={tabErrors.roadmap} /> : null}

            {loadingTab === "roadmap" ? (
              <div className="glass-card" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : roadmap ? (
              <>
                <div className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Study direction</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{roadmap.headline || "Focus on the highest-value missing skills first."}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                      Each topic includes what to learn, a practice task, plus Google and YouTube links so you can start studying immediately.
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
                  {(roadmap.study_plan || []).map((item, index) => (
                    <RoadmapTopicCard key={`${item.topic}-${index}`} item={item} />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  <WeekPlanCard title="Days 1-30" items={roadmap.thirty_day_plan || []} />
                  <WeekPlanCard title="Days 31-60" items={roadmap.sixty_day_plan || []} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  <ListCard title="Suggested certifications" items={roadmap.certifications || []} empty="No certifications suggested." />
                  <ListCard title="Suggested projects" items={roadmap.projects || []} empty="No projects suggested." />
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ color: "var(--text-muted)" }}>Open this tab to generate the study plan.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "salary" ? (
          <div>
            <SectionTitle title="Salary intelligence" subtitle="Comp range, negotiation framing, and market context for the target role" />
            {tabErrors.salary ? <AlertCard message={tabErrors.salary} /> : null}
            {loadingTab === "salary" ? (
              <div className="glass-card" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : salary ? (
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  <StatCard label="Low" value={salary.salary_range?.low || "-"} tone="amber" />
                  <StatCard label="Median" value={salary.salary_range?.median || "-"} tone="green" />
                  <StatCard label="High" value={salary.salary_range?.high || "-"} tone="cyan" />
                </div>
                <ListCard title="Factors affecting pay" items={salary.factors_affecting_pay || []} empty="No factors returned." />
                <div className="glass-card" style={{ padding: 22 }}>
                  <SectionTitle title="Negotiation script" subtitle="Use these talking points as your baseline" />
                  {Object.entries(salary.negotiation_script || {}).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: "0.74rem", textTransform: "uppercase", color: "var(--accent-indigo)", marginBottom: 5 }}>{key.replace(/_/g, " ")}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.65 }}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ color: "var(--text-muted)" }}>Open this tab to load salary intelligence.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "linkedin" ? (
          <div>
            <SectionTitle title="LinkedIn optimizer" subtitle="Generated from your role target and extracted skills" />
            {tabErrors.linkedin ? <AlertCard message={tabErrors.linkedin} /> : null}
            {loadingTab === "linkedin" ? (
              <div className="glass-card" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : linkedin ? (
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                  <StatCard label="Before" value={`${linkedin.profile_score_before || 0}%`} tone="rose" />
                  <StatCard label="After" value={`${linkedin.profile_score_after || 0}%`} tone="green" />
                </div>
                <div className="glass-card" style={{ padding: 22 }}>
                  <SectionTitle title="Optimized headline" />
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.6 }}>{linkedin.optimized_headline}</p>
                </div>
                <div className="glass-card" style={{ padding: 22 }}>
                  <SectionTitle title="Optimized about section" />
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.87rem", lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>{linkedin.optimized_about}</pre>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                  <ListCard title="Add" items={linkedin.skills_to_add || []} empty="No skills suggested to add." />
                  <ListCard title="Remove" items={linkedin.skills_to_remove || []} empty="No skills suggested to remove." />
                  <ListCard title="Prioritize" items={linkedin.skills_to_prioritize || []} empty="No priority skills suggested." />
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ color: "var(--text-muted)" }}>Open this tab to generate LinkedIn recommendations.</p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "recruiter" ? (
          <div style={{ display: "grid", gap: 20 }}>
            <SectionTitle title="Mock interview and recruiter readout" subtitle="A polished recruiter simulation plus a quick note on whether live market data is available." />
            {tabErrors.recruiter ? <AlertCard message={tabErrors.recruiter} /> : null}

            {loadingTab === "recruiter" ? (
              <div className="glass-card" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : recruiter ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <StatCard label="Verdict" value={formatLabel(recruiter.recruiter_verdict)} tone="cyan" />
                  <StatCard label="Interview odds" value={`${recruiter.interview_likelihood_pct || 0}%`} tone="green" />
                  <StatCard label="ATS pass" value={recruiter.ats_pass_prediction === null ? "Unknown" : recruiter.ats_pass_prediction ? "Likely yes" : "Likely no"} tone="amber" />
                  <StatCard label="Generated" value={formatTimestamp(recruiter.generated_at)} tone="indigo" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  <div className="glass-card" style={{ padding: 24 }}>
                    <SectionTitle title="Recruiter verdict" subtitle={recruiter.pile_position?.estimated_rank ? `Estimated pile position: ${formatLabel(recruiter.pile_position.estimated_rank)}` : undefined} />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>{recruiter.verdict_reasoning}</p>
                    {recruiter.pile_position?.explanation ? (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.65, marginTop: 12 }}>
                        <strong style={{ color: "var(--text-primary)" }}>Why:</strong> {recruiter.pile_position.explanation}
                      </p>
                    ) : null}
                  </div>

                  <div className="glass-card" style={{ padding: 24 }}>
                    <SectionTitle title="Live market status" subtitle={recruiter.live_market_data_available ? "Connected" : "Offline fallback"} />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                      {recruiter.market_data_note || "Live market data is not available for this run, so the app is showing a recruiter simulation based on your resume and the JD."}
                    </p>
                    {recruiter.first_impression ? (
                      <div style={{ marginTop: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 14 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>First impression</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6 }}>{recruiter.first_impression}</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  <ListCard
                    title="Why a recruiter may skip"
                    items={(recruiter.skip_reasons || []).map((item) => `${item.reason} Fix: ${item.fix}`)}
                    empty="No recruiter skip reasons returned."
                  />
                  <ListCard title="Strengths noticed" items={recruiter.strengths_noticed || []} empty="No recruiter strengths returned." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  <ListCard title="Shortlist fixes" items={recruiter.shortlist_fixes || []} empty="No shortlist fixes returned." />
                  <ListCard
                    title="Mock round focus"
                    items={recruiter.mock_interview_focus?.length ? recruiter.mock_interview_focus : mockFocusFromInterview}
                    empty="Open the Interview tab to generate mock round focus areas."
                  />
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ color: "var(--text-muted)" }}>Open this tab to simulate recruiter review.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

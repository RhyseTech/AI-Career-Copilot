"use client";

import Link from "next/link";
import Image from "next/image";
import { type CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseResumeSections, renderBalancedTemplate, renderClassicTemplate } from "./resume_template_modules";

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

type PdfTemplate = "classic" | "balanced" | "compact";

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

interface MemorySessionItem {
  id: number;
  title?: string;
  payload?: {
    analysis_result?: AnalysisResult;
    job_description?: string;
  };
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

function cleanResumeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[*_`#]/g, "")
    .replace(/[{}[\]]/g, " ")
    .replace(/^\s*here\s+is\s+the\s+(rewritten|optimized|updated)[^:]*:\s*/i, "")
    .replace(/^\s*in\s+(json|markdown)\s+format\s*:?\s*/i, "")
    .replace(/^\s*(json|markdown)\s+format\s*:?\s*/i, "")
    .replace(/^\s*(response|output)\s*:?\s*/i, "")
    .replace(/^"?optimized_?resume"?\s*:\s*/i, "")
    .replace(/^"?summary"?\s*:\s*/i, "")
    .replace(/^"?experience"?\s*:\s*/i, "")
    .replace(/^"?projects"?\s*:\s*/i, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasLetters(value: string) {
  return /[A-Za-z]/.test(value);
}

function looksLikeAddressOrPhone(value: string) {
  const text = value.trim();
  if (/\d{3}[-\s]?\d{3}[-\s]?\d{4}/.test(text)) return true;
  if (/^\d{1,6}\s+[A-Za-z]/.test(text)) return true;
  if (/\b(st|street|rd|road|ave|avenue|blvd|lane|ln|dr|drive|apt|unit)\b/i.test(text)) return true;
  return false;
}

function looksLikePlaceholderName(value: string) {
  return /^(first name|last name|full name|your name|candidate name|name here)/i.test(value.trim())
    || /(first name|last name|full name|your name|candidate name)/i.test(value);
}

function looksLikeModelArtifact(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return true;
  if (/optimized|rewritten|json|markdown|output|response/.test(text)) return true;
  if (/resume|professional summary|core skills/.test(text) && text.length > 24) return true;
  if (/^here is/.test(text)) return true;
  return false;
}

function isLikelyValidName(value: string) {
  const text = cleanResumeText(value);
  if (!text) return false;
  if (text.length < 3 || text.length > 42) return false;
  if (!hasLetters(text)) return false;
  if (looksLikeAddressOrPhone(text)) return false;
  if (looksLikePlaceholderName(text)) return false;
  if (looksLikeModelArtifact(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  return true;
}

function cleanSkillToken(value: string) {
  return cleanResumeText(value)
    .replace(/^[-*.\d\s]+/, "")
    .replace(/[|,:;]+$/g, "")
    .trim();
}

function isSkillLike(value: string) {
  const text = cleanSkillToken(value);
  if (!text) return false;
  if (text.length < 2 || text.length > 56) return false;
  if (looksLikeModelArtifact(text)) return false;
  if (/[{}[\]"]/g.test(text)) return false;
  return true;
}

function isMeaningfulEntry(value: string) {
  const text = cleanResumeText(value).toLowerCase();
  if (!text) return false;
  if (text === "none" || text === "n/a" || text === "na") return false;
  return true;
}

function scrubSummary(value: string) {
  const cleaned = cleanResumeText(value)
    .replace(/^here is[^.]*resume[^.]*\.\s*/i, "")
    .replace(/^here is[^:]*:\s*/i, "")
    .replace(/^"?optimized_?resume"?\s*:\s*/i, "")
    .replace(/^"?summary"?\s*:\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .trim();
  if (!cleaned || looksLikeModelArtifact(cleaned)) return "";
  return cleaned;
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function extractPhone(text: string) {
  const match = text.match(/(?:\+?\d[\d\s()-]{7,}\d)/);
  return match ? cleanResumeText(match[0]) : "";
}

function extractLinkedin(text: string) {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i);
  return match ? match[0] : "";
}

function pickFirstLikelyName(source: string) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => cleanResumeText(line))
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (!isLikelyValidName(line)) continue;
    if (/summary|experience|education|skills|project|certification/i.test(line)) continue;
    return line;
  }
  return "";
}

function pickSummaryFromOptimized(optimizedResume: string) {
  const lines = optimizedResume
    .split(/\r?\n/)
    .map((line) => cleanResumeText(line))
    .filter(Boolean);
  const filtered = lines.filter(
    (line) =>
      !/^(summary|experience|education|skills|projects|certifications|contact|profile|professional summary)$/i.test(line)
      && !line.startsWith("-")
      && !looksLikeModelArtifact(line)
      && line.length > 35,
  );
  return scrubSummary(filtered.slice(0, 2).join(" "));
}

function extractEducationHints(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => cleanResumeText(line))
    .filter((line) => /university|college|bachelor|master|b\.tech|m\.tech|degree/i.test(line))
    .slice(0, 3);
}

function normalizeDownloadResume(
  rawLayout: unknown,
  optimizedResume: string,
  analysis: AnalysisResult,
  targetRole: string,
  keyChanges: string[],
): DownloadResume {
  const fromRaw = (() => {
    if (!rawLayout) return {} as Partial<DownloadResume>;
    if (typeof rawLayout === "string") {
      try {
        return JSON.parse(rawLayout) as Partial<DownloadResume>;
      } catch {
        return {} as Partial<DownloadResume>;
      }
    }
    if (typeof rawLayout === "object") return rawLayout as Partial<DownloadResume>;
    return {} as Partial<DownloadResume>;
  })();

  // NEW: Fill in gaps from optimized_resume text if layout fields are sparse
  const textSections = parseResumeSections(optimizedResume);

  const sourceName = pickFirstLikelyName(analysis.resume_text || optimizedResume);
  const fullNameCandidate = cleanResumeText(fromRaw.full_name);
  const safeName =
    isLikelyValidName(fullNameCandidate)
      ? fullNameCandidate
      : sourceName || "John Doe";

  const headlineCandidate = cleanResumeText(fromRaw.headline);
  const headlineLooksLikeName = headlineCandidate
    && cleanResumeText(headlineCandidate).toLowerCase() === cleanResumeText(safeName).toLowerCase();
  const safeHeadline =
    headlineCandidate.length >= 3 && !looksLikeModelArtifact(headlineCandidate) && !headlineLooksLikeName
      ? headlineCandidate
      : cleanResumeText(analysis.jd_parsed?.role_title) || cleanResumeText(targetRole) || "Backend Developer";

  const summaryCandidate = cleanResumeText(fromRaw.summary);
  const safeSummary =
    scrubSummary(summaryCandidate)
    || scrubSummary(textSections.summary || "")
    || pickSummaryFromOptimized(optimizedResume)
    || "Results-focused professional with role-relevant execution and measurable outcomes.";

  const rawSkills = Array.isArray(fromRaw.core_skills)
    ? fromRaw.core_skills.map((skill) => cleanSkillToken(skill)).filter((skill) => isSkillLike(skill))
    : [];
  const safeSkillsBase = rawSkills.length
    ? rawSkills
    : [...(textSections.core_skills || []), ...(analysis.parsed_skills || []), ...(analysis.matched_skills || [])]
      .map((skill) => cleanSkillToken(skill))
      .filter((skill) => isSkillLike(skill))
      .filter((skill, idx, arr) => arr.findIndex((entry) => entry.toLowerCase() === skill.toLowerCase()) === idx)
      .slice(0, 24);
  const safeSkills = safeSkillsBase.length
    ? safeSkillsBase
    : (analysis.jd_required_skills || []).map((skill) => cleanSkillToken(skill)).filter((skill) => isSkillLike(skill)).slice(0, 8);

  const rawExperience = Array.isArray(fromRaw.experience) ? fromRaw.experience : [];
  const safeExperience: DownloadResumeExperience[] =
    (rawExperience.length ? rawExperience : (textSections.experience || []))
      .map((item) => ({
        role_title: cleanResumeText(item?.role_title),
        company: cleanResumeText(item?.company),
        location: cleanResumeText(item?.location),
        date_range: cleanResumeText(item?.date_range),
        bullets: Array.isArray(item?.bullets) ? item.bullets.map((bullet) => cleanResumeText(bullet)).filter(Boolean) : [],
      }))
      .filter((item) => item.role_title || item.company || (item.bullets || []).length) || [];

  const repairedExperience = safeExperience.length
    ? safeExperience
    : [
      {
        role_title: safeHeadline,
        company: "Professional Experience",
        location: cleanResumeText(analysis.jd_parsed?.industry) || "",
        date_range: cleanResumeText(analysis.jd_parsed?.years_of_experience) || "",
        bullets: keyChanges.length
          ? keyChanges.slice(0, 4).map((change) => cleanResumeText(change))
          : [
            "Delivered production features and improvements aligned to job requirements.",
            "Improved quality, performance, and collaboration outcomes across projects.",
          ],
      },
    ];

  const rawProjects = Array.isArray(fromRaw.projects) ? fromRaw.projects : [];
  const safeProjects: DownloadResumeProject[] = (rawProjects.length ? rawProjects : (textSections.projects || []))
    .map((project) => ({
      name: cleanResumeText(project?.name),
      subtitle: cleanResumeText(project?.subtitle),
      bullets: Array.isArray(project?.bullets) ? project.bullets.map((bullet) => cleanResumeText(bullet)).filter(Boolean) : [],
    }))
    .filter((project) => project.name || project.subtitle || (project.bullets || []).length);

  const repairedProjects = safeProjects.length
    ? safeProjects
    : [
      {
        name: "Impact Project",
        subtitle: "Role-relevant implementation",
        bullets: [
          "Designed and delivered a project aligned to target role requirements.",
          "Applied core tools and best practices to solve practical use cases.",
        ],
      },
    ];

  const rawEducation = Array.isArray(fromRaw.education)
    ? fromRaw.education.map((entry) => cleanResumeText(entry)).filter((entry) => isMeaningfulEntry(entry))
    : [];
  const safeEducation = rawEducation.length ? rawEducation : [...(textSections.education || []), ...extractEducationHints(analysis.resume_text)];

  const rawCerts = Array.isArray(fromRaw.certifications)
    ? fromRaw.certifications.map((entry) => cleanResumeText(entry)).filter((entry) => isMeaningfulEntry(entry))
    : [];
  const safeCerts = rawCerts.length
    ? rawCerts
    : [...(textSections.certifications || [])]
      .map((entry) => cleanResumeText(entry))
      .filter((entry) => isMeaningfulEntry(entry));

  const fallbackEmail = extractEmail(analysis.resume_text || optimizedResume);
  const fallbackPhone = extractPhone(analysis.resume_text || optimizedResume);
  const fallbackLinkedin = extractLinkedin(analysis.resume_text || optimizedResume);

  return {
    full_name: safeName,
    headline: safeHeadline,
    location: cleanResumeText(fromRaw.location) || "",
    email: cleanResumeText(fromRaw.email) || fallbackEmail,
    phone: cleanResumeText(fromRaw.phone) || fallbackPhone,
    linkedin: cleanResumeText(fromRaw.linkedin) || fallbackLinkedin,
    portfolio: cleanResumeText(fromRaw.portfolio) || "",
    summary: safeSummary,
    core_skills: safeSkills,
    experience: repairedExperience,
    projects: repairedProjects,
    education: safeEducation,
    certifications: safeCerts,
    additional_sections: Array.isArray(fromRaw.additional_sections)
      ? fromRaw.additional_sections.map((section) => ({
        title: cleanResumeText(section?.title),
        items: Array.isArray(section?.items) ? section.items.map((item) => cleanResumeText(item)).filter(Boolean) : [],
      }))
      : [],
  };
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

async function downloadResumePdf(layout: DownloadResume, optimizedResume: string, targetRole: string, template: PdfTemplate = "classic") {
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

  const writeWrapped = (text: string, size = 10.5, color = "#243040", gap = 15, width = contentWidth, x = margin) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, width);
    ensureSpace(lines.length * gap + 4);
    doc.text(lines, x, y);
    y += lines.length * gap;
  };

  const writeSection = (title: string, x = margin, width = contentWidth) => {
    ensureSpace(30);
    y += 10;
    doc.setDrawColor(220, 226, 232);
    doc.line(x, y, x + width, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    doc.text(title.toUpperCase(), x, y);
    y += 14;
  };

  const name = layout.full_name || "Candidate Name";
  const headline = layout.headline || targetRole || "ATS-Friendly Resume";
  const contactLine = [layout.location, layout.email, layout.phone, layout.linkedin, layout.portfolio].filter(Boolean).join("  |  ");

  const renderClassic = () => {
    const rendered = renderClassicTemplate(doc, layout, targetRole);
    y = Math.max(y, rendered.cursorY);
  };

  const renderBalanced = () => {
    const rendered = renderBalancedTemplate(doc, layout, targetRole);
    y = Math.max(y, rendered.cursorY);
  };

  const renderCompact = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(15, 23, 42);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 82, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor("#ffffff");
    doc.text(name, margin, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(headline, margin, 54);
    if (contactLine) {
      doc.setFontSize(8.4);
      doc.setTextColor("#cbd5e1");
      doc.text(doc.splitTextToSize(contactLine, pageWidth - margin * 2), margin, 70);
    }
    y = 96;

    if (layout.summary) {
      writeSection("Summary");
      writeWrapped(layout.summary, 10, "#1f2937", 14);
    }
    if (layout.core_skills?.length) {
      writeSection("Core Skills");
      writeWrapped(layout.core_skills.join(" | "), 9.8, "#1f2937", 13);
    }
    if (layout.experience?.length) {
      writeSection("Experience");
      layout.experience.forEach((entry) => {
        const titleLine = [entry.role_title, entry.company].filter(Boolean).join(" | ");
        const meta = [entry.date_range, entry.location].filter(Boolean).join(" | ");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.3);
        doc.setTextColor("#0f172a");
        if (titleLine) doc.text(titleLine, margin, y);
        y += 13;
        if (meta) writeWrapped(meta, 9, "#64748b", 12);
        (entry.bullets || []).slice(0, 5).forEach((bullet) => {
          const lines = doc.splitTextToSize(`- ${bullet}`, contentWidth - 8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.7);
          doc.setTextColor("#1f2937");
          ensureSpace(lines.length * 12 + 3);
          doc.text(lines, margin + 4, y);
          y += lines.length * 12;
        });
        y += 4;
      });
    }
    if (layout.projects?.length) {
      writeSection("Projects");
      layout.projects.forEach((project) => {
        const t = [project.name, project.subtitle].filter(Boolean).join(" | ");
        if (t) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor("#0f172a");
          doc.text(t, margin, y);
          y += 12;
        }
        (project.bullets || []).slice(0, 3).forEach((bullet) => {
          writeWrapped(`- ${bullet}`, 9.7, "#1f2937", 12);
        });
      });
    }
    if (layout.education?.length) {
      writeSection("Education");
      layout.education.forEach((entry) => writeWrapped(`- ${entry}`, 9.7, "#1f2937", 12));
    }
    if (layout.certifications?.length) {
      writeSection("Certifications");
      layout.certifications.forEach((entry) => writeWrapped(`- ${entry}`, 9.7, "#1f2937", 12));
    }
  };

  if (template === "balanced") renderBalanced();
  else if (template === "compact") renderCompact();
  else renderClassic();

  if (!layout.summary && !layout.experience?.length && optimizedResume) {
    y = Math.max(y, margin + 100);
    writeSection("Optimized Resume");
    writeWrapped(optimizedResume, 10.2, "#243040", 14);
  }

  doc.save(`${sanitizeFileName(name || targetRole || "ats-resume")}-ats-resume-${template}.pdf`);
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

function templateDisplayName(template: PdfTemplate) {
  if (template === "balanced") return "Balanced";
  if (template === "compact") return "Compact";
  return "Classic";
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

function ResumeTemplatePicker({
  value,
  onChange,
  mode = "inline",
}: {
  value: PdfTemplate;
  onChange: (template: PdfTemplate) => void;
  mode?: "inline" | "modal";
}) {
  const isModal = mode === "modal";
  const templates: { id: PdfTemplate; label: string; subtitle: string; accent: string; background: string; modalTint: string; modalBorder: string; modalGlow: string; }[] = [
    {
      id: "classic",
      label: "Classic",
      subtitle: "Simple single-column ATS-safe layout",
      accent: "#2563eb",
      background: "linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.03))",
      modalTint: "linear-gradient(180deg, rgba(37,99,235,0.2), rgba(37,99,235,0.05))",
      modalBorder: "rgba(96,165,250,0.55)",
      modalGlow: "rgba(37,99,235,0.34)",
    },
    {
      id: "balanced",
      label: "Balanced",
      subtitle: "Two-column modern professional layout",
      accent: "#0ea5e9",
      background: "linear-gradient(180deg, rgba(14,165,233,0.18), rgba(14,165,233,0.03))",
      modalTint: "linear-gradient(180deg, rgba(6,182,212,0.22), rgba(6,182,212,0.05))",
      modalBorder: "rgba(34,211,238,0.52)",
      modalGlow: "rgba(6,182,212,0.3)",
    },
    {
      id: "compact",
      label: "Compact",
      subtitle: "Space-saving layout for long experience",
      accent: "#8b5cf6",
      background: "linear-gradient(180deg, rgba(139,92,246,0.18), rgba(139,92,246,0.03))",
      modalTint: "linear-gradient(180deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))",
      modalBorder: "rgba(167,139,250,0.5)",
      modalGlow: "rgba(139,92,246,0.28)",
    },
  ];

  return (
    <div className={isModal ? "" : "glass-card"} style={{ padding: isModal ? 0 : 16, background: isModal ? "transparent" : "rgba(255,255,255,0.02)" }}>
      <div
        style={{
          fontSize: isModal ? "2.2rem" : "0.78rem",
          color: isModal ? "var(--text-primary)" : "var(--text-muted)",
          marginBottom: isModal ? 22 : 12,
          textTransform: isModal ? "none" : "uppercase",
          letterSpacing: isModal ? "-0.01em" : "0.08em",
          fontWeight: isModal ? 800 : 600,
          lineHeight: 1.15,
        }}
      >
        {isModal ? "Selected by Overleaf staff" : "Choose Resume Template"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isModal ? "330px" : "210px"}, 1fr))`, gap: isModal ? 24 : 12 }}>
        {templates.map((item) => {
          const selected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              style={{
                borderRadius: isModal ? 8 : 14,
                border: isModal ? `1px solid ${item.modalBorder}` : selected ? `1px solid ${item.accent}` : "1px solid var(--border-subtle)",
                padding: isModal ? 14 : 10,
                background: isModal ? item.modalTint : selected ? item.background : "rgba(255,255,255,0.01)",
                color: isModal ? "var(--text-primary)" : "inherit",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                boxShadow: isModal
                  ? selected
                    ? `0 0 0 1px ${item.modalBorder}, 0 14px 32px ${item.modalGlow}`
                    : "0 8px 20px rgba(2,6,23,0.32)"
                  : selected
                    ? `0 0 0 1px ${item.accent}30 inset, 0 8px 24px ${item.accent}25`
                    : "none",
              }}
            >
              <div
                style={{
                  height: isModal ? 300 : 132,
                  borderRadius: isModal ? 4 : 10,
                  background: "rgba(255,255,255,0.98)",
                  border: "1px solid rgba(15,23,42,0.1)",
                  padding: isModal ? 14 : 8,
                  marginBottom: isModal ? 12 : 10,
                  overflow: "hidden",
                }}
              >
                {item.id === "classic" ? (
                  <div
                    style={{
                      height: "100%",
                      borderRadius: isModal ? 8 : 6,
                      border: selected ? "2px solid #2563eb" : "1px solid #dbe2ea",
                      background: "#eef1f5",
                      padding: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <Image
                        src="/icon/tem1.png"
                        alt="Classic template preview"
                        fill
                        sizes={isModal ? "33vw" : "220px"}
                        style={{ objectFit: "cover", objectPosition: "center top" }}
                      />
                    </div>
                  </div>
                ) : null}
                {item.id === "balanced" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.85fr", gap: isModal ? 10 : 6, height: "100%" }}>
                    <div style={{ display: "grid", gap: isModal ? 7 : 4, alignContent: "start" }}>
                      <div style={{ height: isModal ? 12 : 8, width: "68%", borderRadius: 4, background: "#111827" }} />
                      <div style={{ height: isModal ? 8 : 5, width: "90%", borderRadius: 4, background: "#9ca3af" }} />
                      <div style={{ height: 2, width: "100%", background: "#e5e7eb", marginTop: 1 }} />
                      <div style={{ height: isModal ? 10 : 6, width: "52%", borderRadius: 4, background: "#b59f64", marginTop: 2 }} />
                      <div style={{ height: isModal ? 8 : 5, width: "95%", borderRadius: 4, background: "#e5e7eb" }} />
                      <div style={{ height: isModal ? 8 : 5, width: "91%", borderRadius: 4, background: "#e5e7eb" }} />
                      <div style={{ height: isModal ? 8 : 5, width: "86%", borderRadius: 4, background: "#e5e7eb" }} />
                    </div>
                    <div style={{ display: "grid", gap: isModal ? 7 : 4, alignContent: "start" }}>
                      <div style={{ height: isModal ? 10 : 6, width: "72%", borderRadius: 4, background: "#3b82f6" }} />
                      <div style={{ height: isModal ? 7 : 4, width: "85%", borderRadius: 4, background: "#d1d5db" }} />
                      <div style={{ height: isModal ? 7 : 4, width: "76%", borderRadius: 4, background: "#e5e7eb" }} />
                      <div style={{ height: isModal ? 10 : 6, width: "65%", borderRadius: 4, background: "#3b82f6", marginTop: 3 }} />
                      <div style={{ height: isModal ? 7 : 4, width: "84%", borderRadius: 4, background: "#d1d5db" }} />
                      <div style={{ height: isModal ? 7 : 4, width: "78%", borderRadius: 4, background: "#e5e7eb" }} />
                    </div>
                  </div>
                ) : null}
                {item.id === "compact" ? (
                  <div style={{ display: "grid", gap: isModal ? 8 : 5 }}>
                    <div style={{ height: isModal ? 34 : 18, borderRadius: 5, background: "#444444" }} />
                    <div style={{ height: isModal ? 10 : 7, width: "42%", borderRadius: 4, background: "#374151" }} />
                    <div style={{ height: isModal ? 8 : 5, width: "100%", borderRadius: 4, background: "#d1d5db" }} />
                    <div style={{ height: isModal ? 8 : 5, width: "94%", borderRadius: 4, background: "#e5e7eb" }} />
                    <div style={{ height: isModal ? 10 : 7, width: "38%", borderRadius: 4, background: "#374151", marginTop: 2 }} />
                    <div style={{ height: isModal ? 8 : 5, width: "96%", borderRadius: 4, background: "#e5e7eb" }} />
                    <div style={{ height: isModal ? 8 : 5, width: "89%", borderRadius: 4, background: "#e5e7eb" }} />
                    <div style={{ height: isModal ? 8 : 5, width: "84%", borderRadius: 4, background: "#e5e7eb" }} />
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: isModal ? "1rem" : "0.9rem", fontWeight: 700 }}>{item.label}</div>
                {selected ? (
                  <span
                    className={isModal ? "" : "chip chip-cyan"}
                    style={isModal ? { fontSize: "0.75rem", padding: "4px 9px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 } : { fontSize: "0.68rem", padding: "2px 8px" }}
                  >
                    Selected
                  </span>
                ) : null}
              </div>
              <div style={{ color: isModal ? "rgba(226,232,240,0.78)" : "var(--text-secondary)", fontSize: isModal ? "0.84rem" : "0.78rem", lineHeight: 1.45 }}>{item.subtitle}</div>
            </button>
          );
        })}
      </div>
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
  const actionButtonStyle: CSSProperties = {
    padding: "10px 14px",
    fontSize: "0.84rem",
    textDecoration: "none",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    color: "var(--text-primary)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

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
          <a href={item.google_link} target="_blank" rel="noreferrer" style={actionButtonStyle}>
            <Image src="/icon/google.png" alt="Google" width={18} height={18} />
            Google
          </a>
        ) : null}
        {item.youtube_link ? (
          <a href={item.youtube_link} target="_blank" rel="noreferrer" style={actionButtonStyle}>
            <Image src="/icon/youtube.png" alt="YouTube" width={18} height={18} />
            YouTube
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
  const [maxAtsMode, setMaxAtsMode] = useState(true);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>("classic");
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
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
  const [memoryStatus, setMemoryStatus] = useState("Session-only mode");

  useEffect(() => {
    const loadDashboardState = async () => {
      const stored = sessionStorage.getItem("analysisResult");
      const storedJd = sessionStorage.getItem("jobDescription");
      const storedSourceLabel = sessionStorage.getItem("jobDescriptionSourceLabel");
      if (stored) {
        const parsed = JSON.parse(stored) as AnalysisResult;
        setResult(parsed);
        setJobDescription(storedJd || parsed.job_description_text || "");
        setJobDescriptionSourceLabel(storedSourceLabel || parsed.job_description_source_label || "");
        setMemoryStatus("Loaded from current browser session");
        return;
      }

      const token = localStorage.getItem("careerCopilotToken");
      if (!token) {
        router.push("/analyze");
        return;
      }

      try {
        const payload = await fetchJson<{ sessions?: MemorySessionItem[] }>(`${API}/api/memory/sessions?limit=1`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const latest = payload.sessions?.[0];
        const analysis = latest?.payload?.analysis_result;
        if (!analysis) {
          router.push("/analyze");
          return;
        }
        const jdText = latest.payload?.job_description || analysis.job_description_text || "";
        setResult(analysis);
        setJobDescription(jdText);
        setJobDescriptionSourceLabel(analysis.job_description_source_label || "Saved session");
        sessionStorage.setItem("analysisResult", JSON.stringify(analysis));
        sessionStorage.setItem("jobDescription", jdText);
        sessionStorage.setItem("jobDescriptionSourceLabel", analysis.job_description_source_label || "Saved session");
        setMemoryStatus("Restored from your account history");
      } catch {
        router.push("/analyze");
      }
    };

    void loadDashboardState();
  }, [router]);

  async function loadResumeOptimization(data: AnalysisResult, force = false, atsMode = maxAtsMode) {
    if (optimizedResume && !force) return;
    setLoadingTab("resume");
    setTabErrors((prev) => ({ ...prev, resume: undefined }));
    try {
      const payload = await fetchJson<OptimizeResponseData>(`${API}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: data.resume_text,
          job_description: jobDescription,
          max_ats_mode: atsMode,
        }),
      });
      const safeOptimized = payload.optimized_resume || "";
      const safeChanges = payload.key_changes || [];
      setOptimizedResume(safeOptimized);
      setKeyChanges(safeChanges);
      setResumeAtsScore(payload.ats_score_estimate || 0);
      const repairedLayout = normalizeDownloadResume(
        payload.download_resume || null,
        safeOptimized,
        data,
        data.jd_parsed?.role_title || "",
        safeChanges,
      );
      setDownloadResume(repairedLayout);
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
          location: (data as any).location || "India",
          seniority: data.jd_seniority || "mid",
          years_experience: data.jd_parsed?.years_of_experience || "3-5",
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
    if (tab === "resume") void loadResumeOptimization(result, false, maxAtsMode);
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
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/agent" className="btn-secondary" style={{ padding: "9px 14px", fontSize: "0.82rem", textDecoration: "none" }}>
              Agent
            </Link>
            <Link href="/auth" className="btn-secondary" style={{ padding: "9px 14px", fontSize: "0.82rem", textDecoration: "none" }}>
              Account
            </Link>
            <Link href="/analyze" className="btn-secondary" style={{ padding: "9px 14px", fontSize: "0.82rem", textDecoration: "none" }}>
              New analysis
            </Link>
          </div>
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
                <span className="chip chip-indigo">{memoryStatus}</span>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <button
                className={maxAtsMode ? "btn-primary" : "btn-secondary"}
                style={{ padding: "10px 14px", fontSize: "0.84rem" }}
                onClick={() => {
                  if (!result) return;
                  const nextMode = !maxAtsMode;
                  setMaxAtsMode(nextMode);
                  void loadResumeOptimization(result, true, nextMode);
                }}
              >
                {maxAtsMode ? "Strict ATS (Active)" : "Switch to Strict ATS"}
              </button>
              <button
                className={!maxAtsMode ? "btn-primary" : "btn-secondary"}
                style={{ padding: "10px 14px", fontSize: "0.84rem" }}
                onClick={() => {
                  if (!result) return;
                  const nextMode = false;
                  setMaxAtsMode(nextMode);
                  void loadResumeOptimization(result, true, nextMode);
                }}
              >
                {!maxAtsMode ? "Balanced Layout (Active)" : "Switch to Balanced"}
              </button>
            </div>

            {tabErrors.resume ? <AlertCard message={tabErrors.resume} /> : null}

            {loadingTab === "resume" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0" }}>
                <div className="spinner" />
                <span style={{ color: "var(--text-secondary)" }}>Re-writing resume sections for peak ATS performance...</span>
              </div>
            ) : optimizedResume ? (
              <div style={{ display: "grid", gap: 22 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <StatCard label="Estimated ATS score" value={`${resumeAtsScore}%`} tone="indigo" />
                  <StatCard label="Key changes" value={keyChanges.length} tone="cyan" />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {keyChanges.map((change, index) => (
                    <span key={index} className="chip chip-indigo">{change}</span>
                  ))}
                </div>

                <div className="glass-card" style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    <span className="chip chip-cyan">Selected template: {templateDisplayName(pdfTemplate)}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}>
                      Click Download ATS PDF to open template gallery.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button className="btn-primary" style={{ padding: "10px 16px", fontSize: "0.84rem" }} onClick={() => setShowTemplateChooser(true)}>
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

      {showTemplateChooser ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "radial-gradient(circle at 20% 15%, rgba(56,189,248,0.2), rgba(2,6,23,0.78) 45%), radial-gradient(circle at 80% 85%, rgba(139,92,246,0.18), rgba(2,6,23,0.9) 55%)",
            backdropFilter: "blur(10px)",
            zIndex: 300,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(1460px, 100%)",
              borderRadius: 20,
              padding: 34,
              border: "1px solid rgba(148,163,184,0.26)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.72), rgba(7,12,28,0.84))",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.15), 0 30px 80px rgba(2,6,23,0.72), 0 0 60px rgba(99,102,241,0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>Choose Your Resume Template</h3>
                <p style={{ color: "rgba(203,213,225,0.84)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Select one design and click download.
                </p>
              </div>
              <button
                type="button"
                style={{ padding: "9px 12px", fontSize: "0.82rem", borderRadius: 10, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.45)", color: "var(--text-primary)", cursor: "pointer" }}
                onClick={() => setShowTemplateChooser(false)}
              >
                Close
              </button>
            </div>

            <ResumeTemplatePicker value={pdfTemplate} onChange={setPdfTemplate} mode="modal" />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                style={{ padding: "10px 16px", fontSize: "0.84rem", borderRadius: 10, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.45)", color: "var(--text-primary)", cursor: "pointer" }}
                onClick={() => setShowTemplateChooser(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ padding: "10px 16px", fontSize: "0.84rem", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#ffffff", cursor: "pointer", fontWeight: 700 }}
                onClick={() => {
                  if (!result) return;
                  void downloadResumePdf(downloadResume || {}, optimizedResume, result.jd_parsed?.role_title || "Resume", pdfTemplate);
                  setShowTemplateChooser(false);
                }}
              >
                Download Selected PDF ({templateDisplayName(pdfTemplate)})
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

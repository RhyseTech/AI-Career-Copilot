import type { jsPDF } from "jspdf";

export interface ResumeTemplateExperience {
  role_title?: string;
  company?: string;
  location?: string;
  date_range?: string;
  bullets?: string[];
}

export interface ResumeTemplateProject {
  name?: string;
  subtitle?: string;
  bullets?: string[];
}

export interface ResumeTemplateSection {
  title?: string;
  items?: string[];
}

export interface ResumeTemplateLayout {
  full_name?: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  core_skills?: string[];
  experience?: ResumeTemplateExperience[];
  projects?: ResumeTemplateProject[];
  education?: string[];
  certifications?: string[];
  additional_sections?: ResumeTemplateSection[];
}

export interface ClassicTemplateRenderResult {
  cursorY: number;
}

export interface BalancedTemplateRenderResult {
  cursorY: number;
}

interface NormalizedLayout {
  fullName: string;
  headline: string;
  contactLine: string;
  summary: string;
  experience: ResumeTemplateExperience[];
  projects: ResumeTemplateProject[];
  education: string[];
  certifications: string[];
  skills: string[];
  achievements: string[];
  additionalSections: ResumeTemplateSection[];
}

const COLOR = {
  text: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  accent: "#1d4ed8",
};

function toAscii(value?: string) {
  if (!value) return "";
  return String(value).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function cleanText(value?: string) {
  if (!value) return "";
  return toAscii(String(value))
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

function safeArray(values?: string[]) {
  return (values || []).map((value) => cleanText(value)).filter(Boolean);
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
  const text = value.trim();
  return /^(first name|last name|full name|your name|candidate name|name here)/i.test(text)
    || /(first name|last name|full name|your name|candidate name)/i.test(text);
}

function looksLikeModelArtifact(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return true;
  if (/optimized|rewritten|json|markdown|response|output/.test(text)) return true;
  if (/^here is/.test(text)) return true;
  if (/resume|professional summary|core skills/.test(text) && text.length > 24) return true;
  return false;
}

function sanitizeName(name?: string, fallback = "John Doe") {
  const candidate = cleanText(name);
  if (!candidate) return fallback;
  if (!hasLetters(candidate)) return fallback;
  if (looksLikeAddressOrPhone(candidate)) return fallback;
  if (looksLikePlaceholderName(candidate)) return fallback;
  if (looksLikeModelArtifact(candidate)) return fallback;
  if (candidate.length > 42) return fallback;
  if (candidate.split(/\s+/).filter(Boolean).length > 5) return fallback;
  return candidate;
}

function getLines(doc: jsPDF, text: string, width: number) {
  const clean = cleanText(text);
  if (!clean) return [] as string[];
  const raw = doc.splitTextToSize(clean, width);
  const lines = Array.isArray(raw) ? raw : [String(raw)];
  return lines.map((line) => cleanText(line)).filter(Boolean);
}

function fitLines(doc: jsPDF, text: string, width: number, maxLines: number) {
  const lines = getLines(doc, text, width);
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  const last = trimmed[maxLines - 1] || "";
  trimmed[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 1)).trim()}...`;
  return trimmed;
}

function drawLines(doc: jsPDF, lines: string[], x: number, y: number, lineHeight: number) {
  if (!lines.length) return y;
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function remainingLines(y: number, bottom: number, lineHeight: number, reserve = 0) {
  return Math.max(0, Math.floor((bottom - y - reserve) / lineHeight));
}

function drawClippedLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  bottom: number,
) {
  const allowed = remainingLines(y, bottom, lineHeight);
  if (allowed <= 0) return y;
  const clipped = lines.slice(0, allowed);
  if (!clipped.length) return y;
  return drawLines(doc, clipped, x, y, lineHeight);
}

function initials(name: string) {
  const parts = cleanText(name).split(" ").filter(Boolean).slice(0, 2);
  const token = parts.map((part) => part[0]?.toUpperCase() || "").join("");
  return token || "JD";
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number, width: number, scale = 1) {
  const label = cleanText(title).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11 * scale);
  doc.setTextColor(COLOR.text);
  doc.text(label, x, y);
  const textWidth = doc.getTextWidth(label);
  const lineStart = x + textWidth + 8 * scale;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.7);
  if (lineStart < x + width) {
    doc.line(lineStart, y + 2 * scale, x + width, y + 2 * scale);
  }
  return y + 16 * scale;
}

function drawAvatar(doc: jsPDF, name: string, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.setFillColor(33, 150, 243);
  doc.circle(cx, cy, size / 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#0b1021");
  doc.text(initials(name), cx, cy + 5, { align: "center" });
}

function sanitizeExperience(experience?: ResumeTemplateExperience[]) {
  const cleaned = (experience || [])
    .map((item) => ({
      role_title: cleanText(item.role_title),
      company: cleanText(item.company),
      location: cleanText(item.location),
      date_range: cleanText(item.date_range),
      bullets: safeArray(item.bullets).slice(0, 8),
    }))
    .filter((item) => item.role_title || item.company || item.bullets.length);

  if (cleaned.length) return cleaned.slice(0, 4);
  return [
    {
      role_title: "Role Title",
      company: "Company",
      location: "",
      date_range: "",
      bullets: [
        "Delivered role-relevant results aligned to business needs.",
        "Improved quality and execution through clear ownership and collaboration.",
      ],
    },
  ];
}

function sanitizeProjects(projects?: ResumeTemplateProject[]) {
  const cleaned = (projects || [])
    .map((item) => ({
      name: cleanText(item.name),
      subtitle: cleanText(item.subtitle),
      bullets: safeArray(item.bullets).slice(0, 6),
    }))
    .filter((item) => item.name || item.subtitle || item.bullets.length);

  if (cleaned.length) return cleaned.slice(0, 3);
  return [
    {
      name: "Impact Project",
      subtitle: "Role-relevant implementation",
      bullets: [
        "Designed and delivered a project aligned to target role requirements.",
        "Applied core tools and best practices to solve practical use cases.",
      ],
    },
  ];
}

function sanitizeAdditionalSections(additionalSections?: ResumeTemplateSection[]) {
  return (additionalSections || [])
    .map((section) => ({
      title: cleanText(section.title),
      items: safeArray(section.items).slice(0, 14),
    }))
    .filter((section) => section.title && section.items.length)
    .filter((section) => !/achievement/i.test(section.title || ""))
    .slice(0, 3);
}

function normalizeLayout(layout: ResumeTemplateLayout, targetRole?: string): NormalizedLayout {
  const fullName = sanitizeName(layout.full_name, "John Doe");
  const rawHeadline = cleanText(layout.headline);
  const headline = rawHeadline
    && rawHeadline.toLowerCase() !== fullName.toLowerCase()
    && !looksLikeModelArtifact(rawHeadline)
    ? rawHeadline
    : cleanText(targetRole) || "Backend Developer";
  const summaryCandidate = cleanText(layout.summary)
    .replace(/^here is[^.]*resume[^.]*\.\s*/i, "")
    .replace(/^here is[^:]*:\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const summary = summaryCandidate && !looksLikeModelArtifact(summaryCandidate)
    ? summaryCandidate
    : "Results-focused professional with role-relevant execution and measurable outcomes.";
  const skills = [...new Set(safeArray(layout.core_skills))].slice(0, 28);
  const safeSkills = skills.length ? skills : ["Communication", "Problem Solving", "Execution"];
  const experience = sanitizeExperience(layout.experience);
  const projects = sanitizeProjects(layout.projects);
  const education = safeArray(layout.education).slice(0, 3);
  const certifications = safeArray(layout.certifications).slice(0, 4);

  const achievementsSection = (layout.additional_sections || []).find((section) =>
    cleanText(section.title).toLowerCase().includes("achievement"),
  );
  const achievements = achievementsSection?.items?.length
    ? safeArray(achievementsSection.items).slice(0, 3)
    : safeArray(experience.flatMap((item) => item.bullets || [])).slice(0, 3);
  const additionalSections = sanitizeAdditionalSections(layout.additional_sections);

  const contactLine = [
    cleanText(layout.phone),
    cleanText(layout.email),
    cleanText(layout.linkedin),
    cleanText(layout.location),
    cleanText(layout.portfolio),
  ]
    .filter(Boolean)
    .join("   ");

  return {
    fullName,
    headline,
    contactLine,
    summary,
    experience,
    projects,
    education,
    certifications,
    skills: safeSkills,
    achievements,
    additionalSections,
  };
}

function estimateContentDensity(layout: NormalizedLayout) {
  const summaryWeight = Math.min(14, Math.ceil(layout.summary.split(/\s+/).filter(Boolean).length / 9));
  const experienceWeight = layout.experience.reduce(
    (acc, item) => acc + 2 + Math.min(6, (item.bullets || []).length),
    0,
  );
  const projectsWeight = layout.projects.reduce(
    (acc, item) => acc + 1 + Math.min(5, (item.bullets || []).length),
    0,
  );
  const skillsWeight = Math.ceil(layout.skills.length / 2);
  const certificationsWeight = layout.certifications.length * 2;
  const educationWeight = layout.education.length * 3;
  const additionalWeight = layout.additionalSections.reduce(
    (acc, section) => acc + Math.min(8, (section.items || []).length),
    0,
  );
  return summaryWeight + experienceWeight + projectsWeight + skillsWeight + certificationsWeight + educationWeight + additionalWeight;
}

function headerKey(line: string) {
  const normalized = cleanText(line).replace(/[:*]/g, "").toLowerCase();
  if (/^(professional summary|summary)$/.test(normalized)) return "summary" as const;
  if (/^(core skills|skills)$/.test(normalized)) return "skills" as const;
  if (/^experience$/.test(normalized)) return "experience" as const;
  if (/^projects?$/.test(normalized)) return "projects" as const;
  if (/^education$/.test(normalized)) return "education" as const;
  if (/^certifications?$/.test(normalized)) return "certifications" as const;
  return null;
}

function parseExperienceLines(lines: string[]) {
  const entries: ResumeTemplateExperience[] = [];
  let current: ResumeTemplateExperience | null = null;

  const flush = () => {
    if (!current) return;
    if (current.role_title || current.company || (current.bullets || []).length) {
      entries.push({
        ...current,
        bullets: (current.bullets || []).slice(0, 6),
      });
    }
    current = null;
  };

  lines.forEach((line) => {
    const cleaned = cleanText(line);
    if (!cleaned) return;

    const isBullet = /^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());
    if (isBullet) {
      if (!current) current = { role_title: "", company: "", bullets: [] };
      current.bullets = [...(current.bullets || []), cleaned.replace(/^[-*\d.\s]+/, "")];
      return;
    }

    const looksDate = /(present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(cleaned);
    if (!current) {
      current = { role_title: cleaned, bullets: [] };
      return;
    }

    if (!current.company && cleaned.length <= 80 && !looksDate) {
      current.company = cleaned;
      return;
    }

    if (!current.date_range && looksDate) {
      current.date_range = cleaned;
      return;
    }

    if ((current.bullets || []).length || current.company || current.date_range) {
      flush();
      current = { role_title: cleaned, bullets: [] };
      return;
    }

    current.role_title = `${current.role_title || ""} ${cleaned}`.trim();
  });

  flush();
  return entries.slice(0, 4);
}

function parseProjectLines(lines: string[]) {
  const entries: ResumeTemplateProject[] = [];
  let current: ResumeTemplateProject | null = null;

  const flush = () => {
    if (!current) return;
    if (current.name || current.subtitle || (current.bullets || []).length) {
      entries.push({
        ...current,
        bullets: (current.bullets || []).slice(0, 5),
      });
    }
    current = null;
  };

  lines.forEach((line) => {
    const cleaned = cleanText(line);
    if (!cleaned) return;
    const isBullet = /^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());

    if (isBullet) {
      if (!current) current = { name: "", bullets: [] };
      current.bullets = [...(current.bullets || []), cleaned.replace(/^[-*\d.\s]+/, "")];
      return;
    }

    if (!current) {
      current = { name: cleaned, bullets: [] };
      return;
    }

    if (!current.subtitle && cleaned.length <= 90) {
      current.subtitle = cleaned;
      return;
    }

    if ((current.bullets || []).length || current.subtitle) {
      flush();
      current = { name: cleaned, bullets: [] };
      return;
    }

    current.name = `${current.name || ""} ${cleaned}`.trim();
  });

  flush();
  return entries.slice(0, 3);
}

export function parseResumeSections(text: string): Partial<ResumeTemplateLayout> {
  const sections: Partial<ResumeTemplateLayout> = {
    experience: [],
    projects: [],
    core_skills: [],
    education: [],
    certifications: [],
  };

  const buckets: Record<string, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  };

  let active: keyof typeof buckets | null = null;
  const lines = String(text || "").split(/\r?\n/);
  lines.forEach((raw) => {
    const line = cleanText(raw);
    if (!line) return;
    const key = headerKey(line);
    if (key) {
      active = key;
      return;
    }
    if (!active) return;
    buckets[active].push(line);
  });

  sections.summary = cleanText(buckets.summary.join(" ")).slice(0, 1200);
  sections.core_skills = [...new Set(
    buckets.skills
      .flatMap((line) => line.split(/[|,/]/))
      .map((skill) => cleanText(skill))
      .filter(Boolean),
  )].slice(0, 24);
  sections.experience = parseExperienceLines(buckets.experience);
  sections.projects = parseProjectLines(buckets.projects);
  sections.education = safeArray(buckets.education).slice(0, 4);
  sections.certifications = safeArray(buckets.certifications).slice(0, 4);

  return sections;
}

export function renderClassicTemplate(doc: jsPDF, layout: ResumeTemplateLayout, targetRole?: string): ClassicTemplateRenderResult {
  const normalized = normalizeLayout(layout, targetRole);
  const density = estimateContentDensity(normalized);
  const isSparse = density < 40;
  const isMedium = density >= 40 && density < 58;
  const fontScale = isSparse ? 1.18 : isMedium ? 1.09 : 1;
  const spaceScale = isSparse ? 1.36 : isMedium ? 1.18 : 1;
  const nameScale = isSparse ? 1.08 : isMedium ? 1.04 : 1;
  const sf = (value: number) => value * fontScale;
  const sv = (value: number) => value * spaceScale;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const top = 45;
  const bottom = pageH - 38;

  const fullW = pageW - marginX * 2;
  const leftW = fullW * 0.56;
  const columnGap = 34;
  const rightW = fullW - leftW - columnGap;
  const leftX = marginX;
  const rightX = leftX + leftW + columnGap;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  const avatarSize = 74;
  const avatarX = pageW - marginX - avatarSize;
  drawAvatar(doc, normalized.fullName, avatarX, top - 10, avatarSize);

  const headerW = avatarX - leftX - 18;
  const compactName = normalized.fullName.replace(/\s+/g, "");
  const nameSize = (compactName.length > 18 ? 30 : 33) * nameScale;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(nameSize);
  doc.setTextColor(COLOR.text);
  let headerY = top + 14;
  headerY = drawLines(doc, fitLines(doc, normalized.fullName.toUpperCase(), headerW, 2), leftX, headerY, sv(nameSize * 0.78));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(sf(13));
  doc.setTextColor(COLOR.accent);
  headerY = drawLines(doc, fitLines(doc, normalized.headline, headerW, 2), leftX, headerY, sv(12));
  headerY += sv(2);

  if (normalized.contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(sf(8.3));
    doc.setTextColor(COLOR.body);
    headerY = drawLines(doc, fitLines(doc, normalized.contactLine, headerW, 2), leftX, headerY, sv(10));
  }

  let leftY = Math.max(top + sv(92), headerY + sv(8));
  let rightY = leftY;

  leftY = sectionTitle(doc, "Summary", leftX, leftY, leftW, fontScale);
  const summaryLineHeight = sv(10);
  const summaryMaxLines = Math.min(12, Math.max(3, remainingLines(leftY, bottom, summaryLineHeight, 130)));
  const summaryLines = fitLines(doc, normalized.summary, leftW - 6, summaryMaxLines);
  const summaryHeight = summaryLines.length * summaryLineHeight + 8;
  if (leftY - 9 + summaryHeight <= bottom) {
    doc.setFillColor(246, 224, 180);
    doc.rect(leftX, leftY - 9, leftW, summaryHeight, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(sf(8.8));
  doc.setTextColor(COLOR.body);
  leftY = drawClippedLines(doc, summaryLines, leftX + 3, leftY, summaryLineHeight, bottom);
  leftY += sv(8);

  leftY = sectionTitle(doc, "Experience", leftX, leftY, leftW, fontScale);
  normalized.experience.forEach((entry) => {
    if (leftY > bottom - sv(42)) return;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(10.4));
    doc.setTextColor(COLOR.text);
    leftY = drawClippedLines(doc, fitLines(doc, entry.role_title || "Role Title", leftW, 2), leftX, leftY, sv(10.5), bottom);

    const company = cleanText(entry.company);
    if (company) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(sf(9.8));
      doc.setTextColor(COLOR.accent);
      leftY = drawClippedLines(doc, fitLines(doc, company, leftW, 1), leftX, leftY, sv(10), bottom);
    }

    const meta = [cleanText(entry.date_range), cleanText(entry.location)].filter(Boolean).join(" | ");
    if (meta) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(sf(8.3));
      doc.setTextColor(COLOR.muted);
      leftY = drawClippedLines(doc, fitLines(doc, meta, leftW, 1), leftX, leftY, sv(9.4), bottom);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(sf(8.5));
    doc.setTextColor(COLOR.body);
    (entry.bullets || []).slice(0, 6).forEach((bullet) => {
      const lines = fitLines(doc, `- ${cleanText(bullet)}`, leftW - 8, 3);
      leftY = drawClippedLines(doc, lines, leftX + 4, leftY, sv(9.6), bottom);
    });

    if (leftY <= bottom - 3) {
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.5);
      doc.line(leftX, leftY + 1, leftX + leftW, leftY + 1);
    }
    leftY += sv(11);
  });

  leftY = sectionTitle(doc, "Education", leftX, leftY, leftW, fontScale);
  const educationEntries = normalized.education.length ? normalized.education : ["Bachelor's Degree | XYZ University"];
  educationEntries.forEach((entry) => {
    if (leftY > bottom - sv(24)) return;
    const parts = cleanText(entry).split("|").map((part) => part.trim()).filter(Boolean);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(10.1));
    doc.setTextColor(COLOR.text);
    leftY = drawClippedLines(doc, fitLines(doc, parts[0] || entry, leftW, 2), leftX, leftY, sv(10), bottom);
    if (parts[1]) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(sf(9.4));
      doc.setTextColor(COLOR.accent);
      leftY = drawClippedLines(doc, fitLines(doc, parts[1], leftW, 1), leftX, leftY, sv(9.6), bottom);
    }
  });

  rightY = sectionTitle(doc, "Certifications", rightX, rightY, rightW, fontScale);
  const certs = normalized.certifications.length ? normalized.certifications : ["Add certifications here."];
  certs.forEach((cert) => {
    if (rightY > bottom - sv(20)) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(9.5));
    doc.setTextColor(certs[0] === "Add certifications here." ? COLOR.muted : COLOR.text);
    rightY = drawClippedLines(doc, fitLines(doc, cert, rightW, 2), rightX, rightY, sv(10.4), bottom);
  });
  rightY += sv(6);

  rightY = sectionTitle(doc, "Key Achievements", rightX, rightY, rightW, fontScale);
  const achievements = normalized.achievements.length ? normalized.achievements : ["Add measurable wins (awards, impact)."];
  achievements.forEach((item) => {
    if (rightY > bottom - sv(20)) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(9.2));
    doc.setTextColor(achievements[0] === "Add measurable wins (awards, impact)." ? COLOR.muted : COLOR.text);
    const label = achievements[0] === "Add measurable wins (awards, impact)." ? item : `- ${item}`;
    rightY = drawClippedLines(doc, fitLines(doc, label, rightW, 3), rightX, rightY, sv(10.2), bottom);
  });
  rightY += sv(5);

  rightY = sectionTitle(doc, "Skills", rightX, rightY, rightW, fontScale);
  const skillItems = normalized.skills.length ? normalized.skills : ["Communication"];
  const longestSkill = Math.max(...skillItems.map((skill) => cleanText(skill).length), 0);
  const cols = longestSkill > 18 ? 2 : longestSkill > 12 ? 3 : 4;
  const colGap = 8;
  const lineHeight = 8.2;
  const rowHeight = sv(cols <= 2 ? 22 : cols === 3 ? 18 : 15);
  const lineLimit = cols <= 2 ? 2 : 1;
  const colWidth = (rightW - colGap * (cols - 1)) / cols;
  skillItems.slice(0, 24).forEach((skill, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const sy = rightY + row * rowHeight;
    if (sy > bottom - sv(5)) return;
    const sx = rightX + col * (colWidth + colGap);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(cols <= 2 ? 8 : 8.1));
    doc.setTextColor("#374151");
    const lines = fitLines(doc, skill, colWidth, lineLimit);
    if (lines.length) {
      doc.text(lines, sx, sy);
      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.45);
      doc.line(sx, sy + lines.length * sv(lineHeight) + 1, sx + colWidth - 2, sy + lines.length * sv(lineHeight) + 1);
    }
  });
  rightY += Math.ceil(Math.min(skillItems.length, 24) / cols) * rowHeight + sv(4);

  rightY = sectionTitle(doc, "Projects", rightX, rightY, rightW, fontScale);
  normalized.projects.forEach((project) => {
    if (rightY > bottom - sv(30)) return;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(sf(9.7));
    doc.setTextColor(COLOR.text);
    rightY = drawClippedLines(doc, fitLines(doc, project.name || "Project Name", rightW, 2), rightX, rightY, sv(10.3), bottom);

    if (project.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(sf(8.4));
      doc.setTextColor(COLOR.body);
      rightY = drawClippedLines(doc, fitLines(doc, project.subtitle, rightW, 2), rightX, rightY, sv(9.3), bottom);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(sf(8.3));
    doc.setTextColor(COLOR.body);
    (project.bullets || []).slice(0, 5).forEach((bullet) => {
      rightY = drawClippedLines(doc, fitLines(doc, `- ${bullet}`, rightW - 6, 3), rightX + 4, rightY, sv(9.1), bottom);
    });

    if (rightY <= bottom - 3) {
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.5);
      doc.line(rightX, rightY + 1, rightX + rightW, rightY + 1);
    }
    rightY += sv(10);
  });

  // Use additional sections (e.g. Tools and Technologies) to avoid large unused lower-half space.
  normalized.additionalSections.forEach((section) => {
    if (rightY > bottom - sv(28)) return;
    rightY = sectionTitle(doc, section.title || "Additional", rightX, rightY, rightW, fontScale);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(sf(8.4));
    doc.setTextColor(COLOR.body);
    section.items?.forEach((item) => {
      if (rightY > bottom - sv(12)) return;
      rightY = drawClippedLines(doc, fitLines(doc, `- ${item}`, rightW - 6, 2), rightX + 4, rightY, sv(9.2), bottom);
    });
    if (rightY <= bottom - 3) {
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.5);
      doc.line(rightX, rightY + 1, rightX + rightW, rightY + 1);
    }
    rightY += sv(8);
  });

  return { cursorY: Math.max(leftY, rightY) };
}

export function renderBalancedTemplate(doc: jsPDF, layout: ResumeTemplateLayout, targetRole?: string): BalancedTemplateRenderResult {
  const normalized = normalizeLayout(layout, targetRole);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const top = 44;
  const bottom = pageH - 38;
  const fullW = pageW - marginX * 2;
  const gap = 24;
  const leftW = fullW * 0.58;
  const rightW = fullW - leftW - gap;
  const leftX = marginX;
  const rightX = leftX + leftW + gap;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  const avatarSize = 64;
  const avatarX = pageW - marginX - avatarSize;
  drawAvatar(doc, normalized.fullName, avatarX, top - 8, avatarSize);

  const headerW = avatarX - leftX - 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(COLOR.text);
  let headerY = top + 14;
  headerY = drawLines(doc, fitLines(doc, normalized.fullName.toUpperCase(), headerW, 2), leftX, headerY, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COLOR.accent);
  headerY = drawLines(doc, fitLines(doc, normalized.headline, headerW, 2), leftX, headerY, 13);

  if (normalized.contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(COLOR.body);
    headerY = drawLines(doc, fitLines(doc, normalized.contactLine, headerW, 2), leftX, headerY + 1, 9.7);
  }

  let leftY = Math.max(top + 90, headerY + 10);
  let rightY = leftY;

  leftY = sectionTitle(doc, "Summary", leftX, leftY, leftW);
  const summaryLines = fitLines(doc, normalized.summary, leftW - 4, 9);
  doc.setFillColor(246, 224, 180);
  const summaryHeight = Math.min(bottom - (leftY - 9), summaryLines.length * 9.8 + 8);
  if (summaryHeight > 0) doc.rect(leftX, leftY - 9, leftW, summaryHeight, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLOR.body);
  leftY = drawClippedLines(doc, summaryLines, leftX + 3, leftY, 9.8, bottom);
  leftY += 8;

  leftY = sectionTitle(doc, "Experience", leftX, leftY, leftW);
  normalized.experience.forEach((entry) => {
    if (leftY > bottom - 42) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.6);
    doc.setTextColor(COLOR.text);
    leftY = drawClippedLines(doc, fitLines(doc, entry.role_title || "Role Title", leftW, 2), leftX, leftY, 10.5, bottom);

    const companyLine = cleanText(entry.company);
    if (companyLine) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.9);
      doc.setTextColor(COLOR.accent);
      leftY = drawClippedLines(doc, fitLines(doc, companyLine, leftW, 1), leftX, leftY, 9.8, bottom);
    }

    const meta = [cleanText(entry.date_range), cleanText(entry.location)].filter(Boolean).join(" | ");
    if (meta) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(COLOR.muted);
      leftY = drawClippedLines(doc, fitLines(doc, meta, leftW, 1), leftX, leftY, 9.3, bottom);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR.body);
    (entry.bullets || []).slice(0, 5).forEach((bullet) => {
      leftY = drawClippedLines(doc, fitLines(doc, `- ${bullet}`, leftW - 6, 2), leftX + 4, leftY, 9.3, bottom);
    });

    if (leftY <= bottom - 3) {
      doc.setDrawColor(214, 218, 224);
      doc.setLineWidth(0.5);
      doc.line(leftX, leftY + 1, leftX + leftW, leftY + 1);
    }
    leftY += 10;
  });

  leftY = sectionTitle(doc, "Projects", leftX, leftY, leftW);
  normalized.projects.forEach((project) => {
    if (leftY > bottom - 30) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.9);
    doc.setTextColor(COLOR.text);
    leftY = drawClippedLines(doc, fitLines(doc, project.name || "Project Name", leftW, 2), leftX, leftY, 10.3, bottom);
    if (project.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR.body);
      leftY = drawClippedLines(doc, fitLines(doc, project.subtitle, leftW, 2), leftX, leftY, 9.2, bottom);
    }
    (project.bullets || []).slice(0, 5).forEach((bullet) => {
      leftY = drawClippedLines(doc, fitLines(doc, `- ${bullet}`, leftW - 6, 3), leftX + 4, leftY, 9.1, bottom);
    });
    if (leftY <= bottom - 3) {
      doc.setDrawColor(214, 218, 224);
      doc.setLineWidth(0.5);
      doc.line(leftX, leftY + 1, leftX + leftW, leftY + 1);
    }
    leftY += 10;
  });

  rightY = sectionTitle(doc, "Skills", rightX, rightY, rightW);
  const longestSkill = Math.max(...normalized.skills.map((skill) => cleanText(skill).length), 0);
  const cols = longestSkill > 18 ? 2 : 3;
  const colGap = 8;
  const lineHeight = 8.3;
  const rowHeight = cols === 2 ? 22 : 16;
  const lineLimit = cols === 2 ? 2 : 1;
  const colWidth = (rightW - colGap * (cols - 1)) / cols;
  normalized.skills.slice(0, 24).forEach((skill, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const sy = rightY + row * rowHeight;
    if (sy > bottom - 5) return;
    const sx = rightX + col * (colWidth + colGap);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cols === 2 ? 8.1 : 8.3);
    doc.setTextColor("#374151");
    const lines = fitLines(doc, skill, colWidth, lineLimit);
    if (lines.length) {
      doc.text(lines, sx, sy);
      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.45);
      doc.line(sx, sy + lines.length * lineHeight + 1, sx + colWidth - 1, sy + lines.length * lineHeight + 1);
    }
  });
  rightY += Math.ceil(Math.min(normalized.skills.length, 24) / cols) * rowHeight + 5;

  rightY = sectionTitle(doc, "Certifications", rightX, rightY, rightW);
  const certs = normalized.certifications.length ? normalized.certifications : ["Add certifications here."];
  certs.forEach((cert) => {
    if (rightY > bottom - 18) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.4);
    doc.setTextColor(certs[0] === "Add certifications here." ? COLOR.muted : COLOR.text);
    rightY = drawClippedLines(doc, fitLines(doc, cert, rightW, 2), rightX, rightY, 10.2, bottom);
  });
  rightY += 5;

  rightY = sectionTitle(doc, "Key Achievements", rightX, rightY, rightW);
  const achievements = normalized.achievements.length ? normalized.achievements : ["Add measurable wins (awards, impact)."];
  achievements.forEach((item) => {
    if (rightY > bottom - 18) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(achievements[0] === "Add measurable wins (awards, impact)." ? COLOR.muted : COLOR.text);
    const label = achievements[0] === "Add measurable wins (awards, impact)." ? item : `- ${item}`;
    rightY = drawClippedLines(doc, fitLines(doc, label, rightW, 3), rightX, rightY, 10, bottom);
  });
  rightY += 5;

  rightY = sectionTitle(doc, "Education", rightX, rightY, rightW);
  const education = normalized.education.length ? normalized.education : ["Bachelor's Degree | XYZ University"];
  education.forEach((entry) => {
    if (rightY > bottom - 20) return;
    const parts = cleanText(entry).split("|").map((part) => part.trim()).filter(Boolean);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.8);
    doc.setTextColor(COLOR.text);
    rightY = drawClippedLines(doc, fitLines(doc, parts[0] || entry, rightW, 2), rightX, rightY, 10, bottom);
    if (parts[1]) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.3);
      doc.setTextColor(COLOR.accent);
      rightY = drawClippedLines(doc, fitLines(doc, parts[1], rightW, 1), rightX, rightY, 9.4, bottom);
    }
  });

  normalized.additionalSections.forEach((section) => {
    if (rightY > bottom - 28) return;
    rightY = sectionTitle(doc, section.title || "Additional", rightX, rightY, rightW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR.body);
    section.items?.forEach((item) => {
      if (rightY > bottom - 12) return;
      rightY = drawClippedLines(doc, fitLines(doc, `- ${item}`, rightW - 6, 2), rightX + 4, rightY, 9.2, bottom);
    });
    rightY += 8;
  });

  return { cursorY: Math.max(leftY, rightY) };
}

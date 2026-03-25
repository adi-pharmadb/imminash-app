"use client";

/**
 * Right panel: ACS application form simulator.
 * Mirrors the real ACS portal at acs.org.au with sections:
 * Personal Details, ANZSCO Code, Upload History, Qualifications, Employment, Summary.
 *
 * Fields are READ-ONLY and populated by the AI as the user chats.
 * Users review the pre-filled form, then copy-paste into the real ACS portal.
 */

import { useState, useEffect, useRef } from "react";
import {
  User,
  Hash,
  Upload,
  GraduationCap,
  Briefcase,
  ClipboardCheck,
  ChevronRight,
  Check,
  Clock,
  Copy,
  CheckCheck,
} from "lucide-react";
import type {
  ACSApplicationData,
  ACSSection,
  ACS_SECTIONS as ACS_SECTIONS_TYPE,
} from "@/types/acs-application";
import { ACS_SECTIONS } from "@/types/acs-application";

interface ACSApplicationPanelProps {
  applicationData: ACSApplicationData;
  activeSection?: ACSSection;
  highlightedSection?: ACSSection | null;
}

const SECTION_ICONS: Record<ACSSection, React.ReactNode> = {
  personal_details: <User className="h-4 w-4" />,
  anzsco_code: <Hash className="h-4 w-4" />,
  upload_history: <Upload className="h-4 w-4" />,
  qualifications: <GraduationCap className="h-4 w-4" />,
  employment: <Briefcase className="h-4 w-4" />,
  summary: <ClipboardCheck className="h-4 w-4" />,
};

function getSectionCompleteness(data: ACSApplicationData, section: ACSSection): "empty" | "partial" | "complete" {
  switch (section) {
    case "personal_details": {
      const d = data.personalDetails;
      const filled = [d.firstName, d.lastName, d.email, d.dateOfBirth, d.citizenship].filter(Boolean).length;
      if (filled === 0) return "empty";
      return filled >= 4 ? "complete" : "partial";
    }
    case "anzsco_code": {
      const d = data.anzscoCode;
      const filled = [d.code, d.title, d.assessmentPathway].filter(Boolean).length;
      if (filled === 0) return "empty";
      return filled >= 2 ? "complete" : "partial";
    }
    case "upload_history": {
      const items = data.uploadHistory.items;
      if (items.length === 0) return "empty";
      const ready = items.filter((i) => i.status === "ready" || i.status === "uploaded").length;
      return ready === items.length ? "complete" : "partial";
    }
    case "qualifications": {
      const entries = data.qualifications.entries;
      if (entries.length === 0) return "empty";
      const filled = entries.filter((e) => e.qualificationTitle && e.institution).length;
      return filled === entries.length ? "complete" : "partial";
    }
    case "employment": {
      const entries = data.employment.entries;
      if (entries.length === 0) return "empty";
      const filled = entries.filter((e) => e.employer && e.jobTitle && e.duties?.length).length;
      return filled === entries.length ? "complete" : "partial";
    }
    case "summary": {
      const d = data.summary;
      if (!d.assessmentOutlook && !d.totalIctYears) return "empty";
      return d.readyToSubmit ? "complete" : "partial";
    }
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  if (!text) return null;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

function FieldRow({ label, value, copyable = true }: { label: string; value?: string; copyable?: boolean }) {
  if (!value) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
        <span className="text-xs text-muted-foreground/60">{label}</span>
        <span className="text-xs italic text-muted-foreground/30">Pending...</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/20 last:border-0 group">
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</span>
        <p className="mt-0.5 text-sm text-foreground leading-relaxed">{value}</p>
      </div>
      {copyable && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={value} />
        </div>
      )}
    </div>
  );
}

function PersonalDetailsSection({ data }: { data: ACSApplicationData }) {
  const d = data.personalDetails;
  return (
    <div className="space-y-1">
      <FieldRow label="Title" value={d.title} />
      <FieldRow label="First Name" value={d.firstName} />
      <FieldRow label="Last Name" value={d.lastName} />
      <FieldRow label="Date of Birth" value={d.dateOfBirth} />
      <FieldRow label="Gender" value={d.gender} />
      <FieldRow label="Country of Birth" value={d.countryOfBirth} />
      <FieldRow label="Citizenship" value={d.citizenship} />
      <FieldRow label="Email" value={d.email} />
      <FieldRow label="Phone" value={d.phone} />
      <FieldRow label="Address" value={d.address} />
      <FieldRow label="Passport Number" value={d.passportNumber} />
      <FieldRow label="Passport Country" value={d.passportCountry} />
    </div>
  );
}

function AnzscoCodeSection({ data }: { data: ACSApplicationData }) {
  const d = data.anzscoCode;
  return (
    <div className="space-y-1">
      <FieldRow label="ANZSCO Code" value={d.code} />
      <FieldRow label="Occupation Title" value={d.title} />
      <FieldRow label="Specialisation" value={d.specialisation} />
      <FieldRow label="Assessment Pathway" value={d.assessmentPathway} />
      {d.pathwayReason && <FieldRow label="Pathway Reason" value={d.pathwayReason} />}
    </div>
  );
}

function UploadHistorySection({ data }: { data: ACSApplicationData }) {
  const items = data.uploadHistory.items;

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground/50 italic">
          Document checklist will appear as the AI identifies required uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: "oklch(0.16 0.01 260 / 0.5)" }}
        >
          <div className="shrink-0">
            {item.status === "ready" || item.status === "uploaded" ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{item.documentName}</p>
            {item.notes && (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={
              item.status === "ready" || item.status === "uploaded"
                ? { background: "oklch(0.45 0.15 155 / 0.15)", color: "oklch(0.75 0.15 155)" }
                : { background: "oklch(0.78 0.12 70 / 0.15)", color: "oklch(0.78 0.12 70)" }
            }
          >
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function QualificationsSection({ data }: { data: ACSApplicationData }) {
  const entries = data.qualifications.entries;

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground/50 italic">
          Your qualifications will be mapped here as you chat with the AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-1"
          style={{
            background: "oklch(0.16 0.01 260 / 0.5)",
            border: "1px solid oklch(0.25 0.015 260 / 0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Qualification {i + 1}
            </span>
            <CopyButton
              text={[
                entry.qualificationTitle,
                entry.institution,
                entry.fieldOfStudy,
                entry.country,
                entry.completionDate ? `Completed: ${entry.completionDate}` : "",
                entry.ictContent ? `ICT Content: ${entry.ictContent}` : "",
              ]
                .filter(Boolean)
                .join("\n")}
            />
          </div>
          <FieldRow label="Qualification" value={entry.qualificationTitle} copyable={false} />
          <FieldRow label="Field of Study" value={entry.fieldOfStudy} copyable={false} />
          <FieldRow label="Institution" value={entry.institution} copyable={false} />
          <FieldRow label="Country" value={entry.country} copyable={false} />
          <FieldRow label="Start Date" value={entry.startDate} copyable={false} />
          <FieldRow label="Completion Date" value={entry.completionDate} copyable={false} />
          <FieldRow label="ICT Content" value={entry.ictContent} copyable={false} />
          <FieldRow label="AQF Level" value={entry.aqfLevel} copyable={false} />
          {entry.notes && <FieldRow label="Notes" value={entry.notes} copyable={false} />}
        </div>
      ))}
    </div>
  );
}

function EmploymentSection({ data }: { data: ACSApplicationData }) {
  const entries = data.employment.entries;

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground/50 italic">
          Your employment history will be structured here as you describe your roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-1"
          style={{
            background: "oklch(0.16 0.01 260 / 0.5)",
            border: "1px solid oklch(0.25 0.015 260 / 0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Position {i + 1}
              {entry.isCurrentRole && (
                <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 normal-case tracking-normal">
                  Current
                </span>
              )}
            </span>
            <CopyButton
              text={[
                entry.employer,
                entry.jobTitle,
                entry.country,
                `${entry.startDate || ""} - ${entry.isCurrentRole ? "Present" : entry.endDate || ""}`,
                entry.weeklyHours ? `${entry.weeklyHours} hours/week` : "",
                "",
                "Duties:",
                ...(entry.alignedDuties || entry.duties || []).map((d) => `- ${d}`),
              ]
                .filter((line) => line !== undefined)
                .join("\n")}
            />
          </div>
          <FieldRow label="Employer" value={entry.employer} copyable={false} />
          <FieldRow label="Job Title" value={entry.jobTitle} copyable={false} />
          <FieldRow label="Country" value={entry.country} copyable={false} />
          <FieldRow label="Period" value={
            entry.startDate
              ? `${entry.startDate} - ${entry.isCurrentRole ? "Present" : entry.endDate || ""}`
              : undefined
          } copyable={false} />
          <FieldRow label="Weekly Hours" value={entry.weeklyHours} copyable={false} />
          <FieldRow label="ICT Related" value={entry.ictRelated !== undefined ? (entry.ictRelated ? "Yes" : "No") : undefined} copyable={false} />

          {/* Duties list */}
          {(entry.alignedDuties || entry.duties) && (
            <div className="pt-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {entry.alignedDuties ? "ANZSCO-Aligned Duties" : "Duties"}
              </span>
              <ul className="mt-1.5 space-y-1.5">
                {(entry.alignedDuties || entry.duties || []).map((duty, di) => (
                  <li
                    key={di}
                    className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                  >
                    <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-primary/60" />
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SummarySection({ data }: { data: ACSApplicationData }) {
  const d = data.summary;

  if (!d.assessmentOutlook && !d.totalIctYears && !d.recommendations?.length) {
    return (
      <div className="py-8 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground/50 italic">
          Your application summary will be generated once all sections are filled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <FieldRow label="Total ICT Experience" value={d.totalIctYears ? `${d.totalIctYears} years` : undefined} />
        <FieldRow label="Relevant ICT Experience" value={d.relevantIctYears ? `${d.relevantIctYears} years` : undefined} />
        <FieldRow label="Qualification Assessment" value={d.qualificationSuitability} />
        <FieldRow label="Assessment Outlook" value={d.assessmentOutlook} />
      </div>

      {d.recommendations && d.recommendations.length > 0 && (
        <div className="pt-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Recommendations
          </span>
          <ul className="mt-2 space-y-2">
            {d.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 leading-relaxed"
                style={{ background: "oklch(0.16 0.01 260 / 0.5)" }}
              >
                <span className="mt-0.5 text-primary">*</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.readyToSubmit && (
        <div
          className="mt-4 rounded-xl p-4 text-center"
          style={{
            background: "oklch(0.45 0.15 155 / 0.1)",
            border: "1px solid oklch(0.45 0.15 155 / 0.2)",
          }}
        >
          <Check className="mx-auto h-6 w-6 text-emerald-400" />
          <p className="mt-2 text-sm font-semibold text-emerald-400">
            Application Ready for ACS Portal
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Copy each section into the real ACS application form at acs.org.au
          </p>
        </div>
      )}
    </div>
  );
}

const SECTION_RENDERERS: Record<ACSSection, (data: ACSApplicationData) => React.ReactNode> = {
  personal_details: (data) => <PersonalDetailsSection data={data} />,
  anzsco_code: (data) => <AnzscoCodeSection data={data} />,
  upload_history: (data) => <UploadHistorySection data={data} />,
  qualifications: (data) => <QualificationsSection data={data} />,
  employment: (data) => <EmploymentSection data={data} />,
  summary: (data) => <SummarySection data={data} />,
};

export function ACSApplicationPanel({
  applicationData,
  highlightedSection,
}: ACSApplicationPanelProps) {
  const [activeSection, setActiveSection] = useState<ACSSection>("personal_details");
  const [prevHighlight, setPrevHighlight] = useState<ACSSection | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // When a section gets highlighted (AI updated it), switch to it
  useEffect(() => {
    if (highlightedSection && highlightedSection !== prevHighlight) {
      setActiveSection(highlightedSection);
      setPrevHighlight(highlightedSection);
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [highlightedSection, prevHighlight]);

  return (
    <div className="flex h-full flex-col bg-background" data-testid="acs-application-panel">
      {/* ACS Portal header bar */}
      <div
        className="flex items-center gap-3 border-b px-5 py-3"
        style={{
          background: "oklch(0.15 0.01 260)",
          borderColor: "oklch(0.25 0.015 260 / 0.5)",
        }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-black"
          style={{
            background: "oklch(0.78 0.12 70)",
            color: "oklch(0.13 0.01 260)",
          }}
        >
          ACS
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Skill Assessment Application</p>
          <p className="text-[11px] text-muted-foreground">Australian Computer Society</p>
        </div>
      </div>

      {/* Section navigation */}
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: "oklch(0.25 0.015 260 / 0.3)" }}
        data-testid="acs-section-nav"
      >
        {ACS_SECTIONS.map(({ key, label }) => {
          const completeness = getSectionCompleteness(applicationData, key);
          const isActive = activeSection === key;
          const isHighlighted = highlightedSection === key;

          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-medium transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              } ${isHighlighted ? "animate-pulse-glow" : ""}`}
              data-testid={`acs-nav-${key}`}
            >
              <span className={isActive ? "text-primary" : "text-muted-foreground/60"}>
                {SECTION_ICONS[key]}
              </span>
              <span className="whitespace-nowrap">{label}</span>

              {/* Completeness indicator */}
              {completeness !== "empty" && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      completeness === "complete"
                        ? "oklch(0.75 0.15 155)"
                        : "oklch(0.78 0.12 70)",
                  }}
                />
              )}

              {/* Active indicator */}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.78_0.12_70_/_0.4)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-5 py-5 md:px-6"
        data-testid="acs-section-content"
      >
        {/* Section header */}
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="text-primary/70">{SECTION_ICONS[activeSection]}</span>
            <h3 className="font-display text-lg italic text-foreground">
              {ACS_SECTIONS.find((s) => s.key === activeSection)?.label}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {activeSection === "personal_details" && "Your personal information for the ACS application."}
            {activeSection === "anzsco_code" && "The nominated ANZSCO occupation and assessment pathway."}
            {activeSection === "upload_history" && "Documents required for your ACS application."}
            {activeSection === "qualifications" && "Your educational qualifications and ICT content assessment."}
            {activeSection === "employment" && "Your employment history with ANZSCO-aligned duty statements."}
            {activeSection === "summary" && "Application overview and readiness assessment."}
          </p>
        </div>

        {/* Section content renderer */}
        <div
          className={`transition-all duration-500 ${
            highlightedSection === activeSection
              ? "rounded-xl p-3 ring-1 ring-primary/20 shadow-[0_0_20px_oklch(0.78_0.12_70_/_0.06)]"
              : ""
          }`}
        >
          {SECTION_RENDERERS[activeSection](applicationData)}
        </div>
      </div>

      {/* Footer: copy-paste reminder */}
      <div
        className="border-t px-5 py-3 text-center"
        style={{
          background: "oklch(0.14 0.01 260 / 0.8)",
          borderColor: "oklch(0.25 0.015 260 / 0.3)",
        }}
      >
        <p className="text-[11px] text-muted-foreground/60">
          Hover over any field to copy. Transfer completed sections to{" "}
          <span className="font-semibold text-primary/70">acs.org.au</span>
        </p>
      </div>
    </div>
  );
}

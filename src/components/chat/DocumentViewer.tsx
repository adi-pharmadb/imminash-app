"use client";

/**
 * DocumentViewer — premium modal for viewing a drafted document.
 *
 * Trust & Authority styling: gold seal, EB Garamond serif body, navy
 * accents, letter-style preview that resembles the actual deliverable.
 * Includes per-format download (PDF / DOCX) when conversationId is
 * supplied, and a copy-as-plain-text affordance.
 */

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ConversationDocument } from "@/lib/conversation-state";

interface DocumentViewerProps {
  document: ConversationDocument;
  /** When supplied, enables PDF/DOCX download via the conversation endpoint. */
  conversationId?: string;
  onClose: () => void;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? (v as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toPlainText(doc: ConversationDocument): string {
  const c = doc.content ?? {};
  const lines: string[] = [doc.title || "Document", ""];

  const writeKv = (label: string, value: string) => {
    if (value) lines.push(`${label}: ${value}`);
  };
  const writeList = (label: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push("");
    lines.push(`${label}:`);
    for (const i of items) lines.push(`- ${i}`);
  };

  switch (doc.document_type) {
    case "employment_reference":
    case "statement_of_service":
    case "msa_employer_template": {
      writeKv("Employer", asString(c.employer));
      writeKv("ABN", asString(c.abn));
      writeKv("Position", asString(c.position));
      writeKv("Period", asString(c.period));
      writeKv("Hours per week", String(c.hours_per_week ?? ""));
      const sup = c.supervisor;
      if (typeof sup === "string") writeKv("Supervisor", sup);
      else if (sup && typeof sup === "object") {
        const s = sup as Record<string, unknown>;
        writeKv("Supervisor name", asString(s.name));
        writeKv("Supervisor title", asString(s.title));
        writeKv("Supervisor email", asString(s.email));
        writeKv("Supervisor phone", asString(s.phone));
      }
      writeList("Duties", asStringArray(c.duties));
      break;
    }
    case "career_episode": {
      const chron = asRecord(c.chronology);
      writeKv("Title", asString(c.title));
      writeKv("Dates", asString(chron.dates));
      writeKv("Location", asString(chron.location));
      writeKv("Role", asString(chron.role));
      writeKv("Organisation", asString(chron.organisation));
      lines.push("", "Introduction:", asString(c.introduction));
      lines.push("", "Background:", asString(c.background));
      lines.push("", "Personal Engineering Activity:", asString(c.personal_engineering_activity));
      lines.push("", "Summary:", asString(c.summary));
      writeList("Competency references", asStringArray(c.competency_references));
      break;
    }
    case "summary_statement": {
      const elements = asRecord(c.elements);
      for (const [key, val] of Object.entries(elements)) {
        const v = asRecord(val);
        lines.push(`${key}: ${asString(v.claim)} (ref: ${asString(v.career_episode_ref)}, para ${asString(v.paragraph)})`);
      }
      break;
    }
    case "cpd_log": {
      const entries = Array.isArray(c.entries) ? (c.entries as unknown[]) : [];
      for (const e of entries) {
        const r = asRecord(e);
        lines.push(`${asString(r.date)} · ${asString(r.activity)} · ${asString(r.hours)}h · ${asString(r.type)}`);
      }
      break;
    }
    case "statutory_declaration": {
      writeKv("Deponent", asString(c.deponent));
      writeKv("Employer", asString(c.employer));
      writeKv("Period", asString(c.period));
      writeKv("Position", asString(c.position));
      writeKv("Reason", asString(c.reason));
      writeList("Duties", asStringArray(c.duties));
      writeKv("Sworn at", asString(c.sworn_at));
      writeKv("Sworn on", asString(c.sworn_on));
      break;
    }
    case "evidence_bundle": {
      writeKv("Employer", asString(c.employer));
      const items = Array.isArray(c.items) ? (c.items as unknown[]) : [];
      lines.push("", "Items:");
      for (const i of items) {
        const r = asRecord(i);
        lines.push(`- ${asString(r.type)}: ${asString(r.description)} (${asString(r.date)})`);
      }
      break;
    }
    case "cv_structured": {
      writeKv("Summary", asString(c.summary));
      const exp = Array.isArray(c.experience) ? (c.experience as unknown[]) : [];
      for (const e of exp) {
        const r = asRecord(e);
        lines.push(`- ${asString(r.position)} at ${asString(r.employer)} (${asString(r.period)})`);
      }
      break;
    }
    default:
      lines.push(JSON.stringify(c, null, 2));
  }

  return lines.join("\n");
}

export function DocumentViewer({
  document: doc,
  conversationId,
  onClose,
}: DocumentViewerProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [copied, setCopied] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click-outside on download menu
  useEffect(() => {
    if (!downloadOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setDownloadOpen(false);
      }
    };
    window.document.addEventListener("mousedown", handler);
    return () => window.document.removeEventListener("mousedown", handler);
  }, [downloadOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(doc));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!conversationId || downloading) return;
    setDownloadOpen(false);
    setDownloading(format);
    try {
      const res = await fetch(
        `/api/documents/conversation/${conversationId}/${doc.id}?format=${format}`,
      );
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.${format}`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div
      className="premium fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="document-viewer"
    >
      <div
        className="premium-stat-reveal relative flex h-[100dvh] w-full flex-col overflow-hidden border border-border bg-card shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-viewer-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-7 py-5">
          <div className="flex items-start gap-3">
            <span
              className="premium-seal h-11 w-11 shrink-0"
              aria-hidden
              title="Drafted by Imminash against ACS criteria"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                Draft • {formatTypeLabel(doc.document_type)}
              </p>
              <h2
                id="document-viewer-title"
                className="font-serif-premium text-2xl font-medium leading-tight text-foreground"
              >
                {doc.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversationId && (
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setDownloadOpen((v) => !v)}
                  disabled={Boolean(downloading)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-gold px-3.5 font-premium-body text-xs font-semibold uppercase tracking-[0.06em] text-gold-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
                  aria-haspopup="menu"
                  aria-expanded={downloadOpen}
                  data-testid="document-download"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloading ? `${downloading.toUpperCase()}…` : "Download"}
                  {!downloading && <ChevronDown className="h-3 w-3" />}
                </button>
                {downloadOpen && !downloading && (
                  <div
                    role="menu"
                    className="absolute right-0 top-11 z-10 w-36 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleDownload("pdf")}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                    >
                      <Download className="h-4 w-4 text-gold" />
                      PDF
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleDownload("docx")}
                      className="flex w-full cursor-pointer items-center gap-2 border-t border-border/60 px-3 py-2 text-left text-sm hover:bg-secondary"
                    >
                      <Download className="h-4 w-4 text-gold" />
                      DOCX
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Copy as plain text"
              title="Copy as plain text"
            >
              {copied ? (
                <Check className="h-4 w-4 text-gold" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-premium-canvas px-9 py-8 md:px-12 md:py-10">
          <DocumentBody doc={doc} />
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-card px-7 py-4">
          <p className="font-premium-body text-[11px] italic leading-relaxed text-muted-foreground">
            Draft only. Paraphrase before use, follow the submission
            playbook for letterhead / signature / format requirements
            specific to your assessing body.
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentBody({ doc }: { doc: ConversationDocument }) {
  const c = asRecord(doc.content);
  switch (doc.document_type) {
    case "employment_reference":
    case "statement_of_service":
      return <LetterBody doc={doc} />;
    case "msa_employer_template":
      return <TemplateFormBody content={c} />;
    case "career_episode":
      return <CareerEpisodeBody content={c} />;
    case "summary_statement":
      return <SummaryStatementBody content={c} />;
    case "cpd_log":
      return <CpdLogBody content={c} />;
    case "statutory_declaration":
      return <StatDecBody content={c} />;
    case "evidence_bundle":
      return <EvidenceBundleBody content={c} />;
    case "rpl_report":
    case "cv_structured":
    default:
      return <GenericKeyValueBody content={c} />;
  }
}

function LetterBody({ doc }: { doc: ConversationDocument }) {
  const c = asRecord(doc.content);
  const employer = asString(c.employer);
  const position = asString(c.position);
  const period = asString(c.period);
  const duties = asStringArray(c.duties);
  const supRaw = c.supervisor;
  const supervisor = typeof supRaw === "string"
    ? supRaw
    : asString(asRecord(supRaw).name);
  return (
    <article className="font-serif-premium text-[13px] leading-[1.7] text-foreground">
      <p className="font-premium-body text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {employer || "Employer"}
        {period ? ` • ${period}` : ""}
      </p>
      <hr className="my-5 border-border/60" />
      <p className="mb-5">To whom it may concern,</p>
      <p className="mb-5">
        I am writing to confirm that the applicant was employed at{" "}
        <strong className="font-semibold">{employer || "[Employer]"}</strong>
        {position ? <> as <strong className="font-semibold">{position}</strong></> : null}
        {period ? <> from <strong className="font-semibold">{period}</strong></> : null}.
      </p>
      {duties.length > 0 && (
        <>
          <p className="mb-3">Their day-to-day duties included:</p>
          <ul className="mb-6 space-y-2 pl-5">
            {duties.map((d, i) => <li key={i} className="list-disc">{d}</li>)}
          </ul>
        </>
      )}
      <p className="mb-2">
        I confirm the above and am happy to respond to further questions regarding the applicant&apos;s role.
      </p>
      <p className="mt-10">Sincerely,</p>
      <p className="mt-1 font-medium">{supervisor || "[Supervisor name]"}</p>
      <p className="font-premium-body text-xs text-muted-foreground">{employer || "[Employer]"}</p>
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 border-b border-border/40 py-1.5 text-[13px]">
      <span className="font-premium-body text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-serif-premium text-foreground">{value}</span>
    </div>
  );
}

function TemplateFormBody({ content }: { content: Record<string, unknown> }) {
  const emp = asRecord(content.employer);
  const empl = asRecord(content.employee);
  const role = asRecord(content.role);
  const sup = asRecord(content.supervisor);
  const duties = asStringArray(content.duties);
  return (
    <article className="font-serif-premium text-foreground">
      <h3 className="font-premium-body text-xs uppercase tracking-wider text-gold">Employer</h3>
      <Kv label="Name" value={asString(emp.name)} />
      <Kv label="ABN" value={asString(emp.abn)} />
      <Kv label="Address" value={asString(emp.address)} />
      <h3 className="mt-5 font-premium-body text-xs uppercase tracking-wider text-gold">Employee</h3>
      <Kv label="Full name" value={asString(empl.name)} />
      <h3 className="mt-5 font-premium-body text-xs uppercase tracking-wider text-gold">Role</h3>
      <Kv label="Position" value={asString(role.title)} />
      <Kv label="Start" value={asString(role.start)} />
      <Kv label="End" value={asString(role.end)} />
      <Kv label="Hours/week" value={String(role.hours ?? "")} />
      {duties.length > 0 && (
        <>
          <h3 className="mt-5 font-premium-body text-xs uppercase tracking-wider text-gold">Duties</h3>
          <ul className="mt-2 space-y-1.5 pl-5 text-[13px]">
            {duties.map((d, i) => <li key={i} className="list-disc">{d}</li>)}
          </ul>
        </>
      )}
      <h3 className="mt-5 font-premium-body text-xs uppercase tracking-wider text-gold">Supervisor sign-off</h3>
      <Kv label="Name" value={asString(sup.name)} />
      <Kv label="Title" value={asString(sup.title)} />
      <Kv label="Phone" value={asString(sup.phone)} />
      <Kv label="Email" value={asString(sup.email)} />
    </article>
  );
}

function CareerEpisodeBody({ content }: { content: Record<string, unknown> }) {
  const chron = asRecord(content.chronology);
  const refs = asStringArray(content.competency_references);
  const Section = ({ title, body }: { title: string; body: string }) => body ? (
    <section className="mb-6">
      <h3 className="mb-2 font-premium-body text-xs uppercase tracking-wider text-gold">{title}</h3>
      <p className="whitespace-pre-wrap font-serif-premium text-[13px] leading-[1.7] text-foreground">{body}</p>
    </section>
  ) : null;
  return (
    <article>
      <h2 className="font-serif-premium text-2xl font-medium text-foreground">{asString(content.title) || "Career Episode"}</h2>
      <div className="mt-3 font-premium-body text-xs text-muted-foreground">
        {[asString(chron.role), asString(chron.organisation), asString(chron.location), asString(chron.dates)].filter(Boolean).join(" · ")}
      </div>
      <hr className="my-5 border-border/60" />
      <Section title="Introduction" body={asString(content.introduction)} />
      <Section title="Background" body={asString(content.background)} />
      <Section title="Personal Engineering Activity" body={asString(content.personal_engineering_activity)} />
      <Section title="Summary" body={asString(content.summary)} />
      {refs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {refs.map((r) => (
            <span key={r} className="rounded-full bg-gold/10 px-2.5 py-0.5 font-premium-body text-[11px] font-medium text-gold">{r}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function SummaryStatementBody({ content }: { content: Record<string, unknown> }) {
  const elements = asRecord(content.elements);
  const entries = Object.entries(elements);
  if (entries.length === 0) return <GenericKeyValueBody content={content} />;
  return (
    <article>
      <h2 className="mb-4 font-serif-premium text-xl font-medium text-foreground">Summary Statement</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border/60">
              <th className="pb-2 pr-3 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Element</th>
              <th className="pb-2 pr-3 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Claim</th>
              <th className="pb-2 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Ref (episode:para)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => {
              const v = asRecord(val);
              return (
                <tr key={key} className="border-b border-border/30">
                  <td className="py-2 pr-3 align-top font-mono text-xs font-medium text-gold">{key}</td>
                  <td className="py-2 pr-3 align-top font-serif-premium text-foreground">{asString(v.claim)}</td>
                  <td className="py-2 align-top font-serif-premium text-muted-foreground">CE{asString(v.career_episode_ref)}:{asString(v.paragraph)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function CpdLogBody({ content }: { content: Record<string, unknown> }) {
  const entries = Array.isArray(content.entries) ? (content.entries as unknown[]) : [];
  return (
    <article>
      <h2 className="mb-4 font-serif-premium text-xl font-medium text-foreground">Continuing Professional Development Log</h2>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border/60">
            <th className="pb-2 pr-3 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Date</th>
            <th className="pb-2 pr-3 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Activity</th>
            <th className="pb-2 pr-3 text-left font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="pb-2 text-right font-premium-body text-xs uppercase tracking-wider text-muted-foreground">Hours</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const r = asRecord(e);
            return (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2 pr-3 font-premium-body text-xs text-muted-foreground">{asString(r.date)}</td>
                <td className="py-2 pr-3 font-serif-premium text-foreground">{asString(r.activity)}</td>
                <td className="py-2 pr-3 font-premium-body text-xs text-muted-foreground">{asString(r.type)}</td>
                <td className="py-2 text-right font-mono text-xs text-foreground">{asString(r.hours)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function StatDecBody({ content }: { content: Record<string, unknown> }) {
  const duties = asStringArray(content.duties);
  return (
    <article className="font-serif-premium text-[13px] leading-[1.7] text-foreground">
      <h2 className="mb-2 font-serif-premium text-xl font-medium">Statutory Declaration</h2>
      <p className="font-premium-body text-[11px] uppercase tracking-wider text-muted-foreground">
        Must be signed before an authorised witness (JP, solicitor, pharmacist).
      </p>
      <hr className="my-4 border-border/60" />
      <p className="mb-4">
        I, <strong>{asString(content.deponent) || "[Deponent name]"}</strong>, do solemnly and sincerely declare:
      </p>
      <p className="mb-3">
        I was employed at <strong>{asString(content.employer) || "[Employer]"}</strong>
        {asString(content.position) ? <> as <strong>{asString(content.position)}</strong></> : null}
        {asString(content.period) ? <> from <strong>{asString(content.period)}</strong></> : null}.
      </p>
      {duties.length > 0 && (
        <>
          <p className="mb-2">My duties included:</p>
          <ul className="mb-4 space-y-1.5 pl-5">
            {duties.map((d, i) => <li key={i} className="list-disc">{d}</li>)}
          </ul>
        </>
      )}
      {asString(content.reason) && (
        <p className="mb-4">
          <em className="text-muted-foreground">Reason for statutory declaration: </em>
          {asString(content.reason)}
        </p>
      )}
      <p className="mt-8">Declared at {asString(content.sworn_at) || "[location]"} on {asString(content.sworn_on) || "[date]"}.</p>
    </article>
  );
}

function EvidenceBundleBody({ content }: { content: Record<string, unknown> }) {
  const items = Array.isArray(content.items) ? (content.items as unknown[]) : [];
  return (
    <article>
      <h2 className="mb-3 font-serif-premium text-xl font-medium">Evidence Bundle</h2>
      <p className="mb-4 font-premium-body text-xs text-muted-foreground">
        Corroborating employment evidence for {asString(content.employer) || "[employer]"}.
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => {
          const r = asRecord(it);
          return (
            <li key={i} className="rounded-md border border-border/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-premium-body text-xs font-semibold uppercase tracking-wider text-gold">{asString(r.type) || "Item"}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{asString(r.date)}</span>
              </div>
              <p className="mt-1 font-serif-premium text-[13px] text-foreground">{asString(r.description)}</p>
              {asString(r.verifier) && (
                <p className="mt-1 font-premium-body text-[11px] text-muted-foreground">Verifier: {asString(r.verifier)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function GenericKeyValueBody({ content }: { content: Record<string, unknown> }) {
  const entries = Object.entries(content);
  if (entries.length === 0) {
    return <p className="font-serif-premium text-sm text-muted-foreground">No content yet.</p>;
  }
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <Kv
          key={k}
          label={formatTypeLabel(k)}
          value={typeof v === "string" ? v : JSON.stringify(v)}
        />
      ))}
    </div>
  );
}

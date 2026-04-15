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

function toPlainText(doc: ConversationDocument): string {
  const c = doc.content ?? {};
  const employer = asString(c.employer);
  const position = asString(c.position);
  const period = asString(c.period);
  const supervisor = asString(c.supervisor);
  const duties = asStringArray(c.duties);

  const lines: string[] = [];
  lines.push(doc.title || "Document");
  lines.push("");
  if (employer) lines.push(`Employer: ${employer}`);
  if (position) lines.push(`Position: ${position}`);
  if (period) lines.push(`Period: ${period}`);
  if (supervisor) lines.push(`Supervisor: ${supervisor}`);
  if (duties.length > 0) {
    lines.push("");
    lines.push("Duties:");
    for (const d of duties) lines.push(`- ${d}`);
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

  const c = doc.content ?? {};
  const employer = asString(c.employer);
  const position = asString(c.position);
  const period = asString(c.period);
  const supervisor = asString(c.supervisor);
  const duties = asStringArray(c.duties);
  const isLetter = doc.document_type === "employment_reference";

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
      className="premium fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="document-viewer"
    >
      <div
        className="premium-stat-reveal relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
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
                Draft • {doc.document_type.replace(/_/g, " ")}
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
          {isLetter ? (
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
                {position ? (
                  <>
                    {" "}as <strong className="font-semibold">{position}</strong>
                  </>
                ) : null}
                {period ? (
                  <>
                    {" "}from <strong className="font-semibold">{period}</strong>
                  </>
                ) : null}
                .
              </p>

              {duties.length > 0 && (
                <>
                  <p className="mb-3">Their day-to-day duties included:</p>
                  <ul className="mb-6 space-y-2 pl-5">
                    {duties.map((d, i) => (
                      <li key={i} className="list-disc">
                        {d}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="mb-2">
                I am happy to confirm the above and respond to any further questions
                regarding the applicant&apos;s role and contributions during their
                tenure.
              </p>

              <p className="mt-10">Sincerely,</p>
              <p className="mt-1 font-medium">{supervisor || "[Supervisor name]"}</p>
              <p className="font-premium-body text-xs text-muted-foreground">
                {employer || "[Employer]"}
              </p>
            </article>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-serif-premium text-sm text-foreground">
              {JSON.stringify(doc.content, null, 2)}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-card px-7 py-4">
          <p className="font-premium-body text-[11px] italic leading-relaxed text-muted-foreground">
            Draft only. Paraphrase before use, print on company letterhead, and
            obtain your supervisor&apos;s signature before submitting to ACS.
          </p>
        </div>
      </div>
    </div>
  );
}

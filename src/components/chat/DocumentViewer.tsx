"use client";

/**
 * DocumentViewer — modal overlay that renders a saved conversation document
 * (currently optimised for employment_reference letters). Opens on row click
 * in LiveSummaryPanel. Escape + backdrop click close it.
 */

import { useEffect } from "react";
import { Copy, X } from "lucide-react";
import type { ConversationDocument } from "@/lib/conversation-state";

interface DocumentViewerProps {
  document: ConversationDocument;
  onClose: () => void;
}

function stringifyDuty(d: unknown): string {
  return typeof d === "string" ? d : "";
}

function toPlainText(doc: ConversationDocument): string {
  const c = doc.content ?? {};
  const employer = typeof c.employer === "string" ? c.employer : "";
  const position = typeof c.position === "string" ? c.position : "";
  const period = typeof c.period === "string" ? c.period : "";
  const supervisor = typeof c.supervisor === "string" ? c.supervisor : "";
  const duties = Array.isArray(c.duties)
    ? (c.duties as unknown[]).map(stringifyDuty).filter(Boolean)
    : [];

  const lines: string[] = [];
  lines.push(`EMPLOYMENT REFERENCE`);
  lines.push("");
  if (employer) lines.push(`Employer: ${employer}`);
  if (position) lines.push(`Position: ${position}`);
  if (period) lines.push(`Period: ${period}`);
  if (supervisor) lines.push(`Supervisor: ${supervisor}`);
  if (duties.length) {
    lines.push("");
    lines.push("Duties:");
    duties.forEach((d) => lines.push(`- ${d}`));
  }
  return lines.join("\n");
}

export function DocumentViewer({ document: doc, onClose }: DocumentViewerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const c = doc.content ?? {};
  const employer = typeof c.employer === "string" ? c.employer : "";
  const position = typeof c.position === "string" ? c.position : "";
  const period = typeof c.period === "string" ? c.period : "";
  const supervisor = typeof c.supervisor === "string" ? c.supervisor : "";
  const duties = Array.isArray(c.duties)
    ? (c.duties as unknown[]).map(stringifyDuty).filter(Boolean)
    : [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(doc));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      data-testid="document-viewer"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {doc.status}
            </p>
            <h2 className="mt-1 font-display text-xl text-foreground">{doc.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Copy as plain text"
              title="Copy as plain text"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground">
          {doc.document_type === "employment_reference" ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                {employer && (
                  <>
                    <dt className="text-muted-foreground">Employer</dt>
                    <dd className="font-medium">{employer}</dd>
                  </>
                )}
                {position && (
                  <>
                    <dt className="text-muted-foreground">Position</dt>
                    <dd className="font-medium">{position}</dd>
                  </>
                )}
                {period && (
                  <>
                    <dt className="text-muted-foreground">Period</dt>
                    <dd className="font-medium">{period}</dd>
                  </>
                )}
                {supervisor && (
                  <>
                    <dt className="text-muted-foreground">Supervisor</dt>
                    <dd className="font-medium">{supervisor}</dd>
                  </>
                )}
              </dl>

              {duties.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Duties
                  </h3>
                  <ul className="space-y-2">
                    {duties.map((d, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        <span className="text-foreground/90">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">
              {JSON.stringify(doc.content, null, 2)}
            </pre>
          )}
        </div>

        {/* Footer note */}
        <div className="border-t border-border/60 px-6 py-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Draft only. You must paraphrase before submitting and have your
          supervisor sign it on company letterhead.
        </div>
      </div>
    </div>
  );
}

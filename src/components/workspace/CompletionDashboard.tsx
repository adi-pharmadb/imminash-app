"use client";

/**
 * Completion Dashboard: shown in Zone 2 when all documents are approved.
 * Displays compliance summary, ZIP manifest, next-steps guide, and download button.
 */

import { Download, CheckCircle2, FileText, Loader2 } from "lucide-react";
import type { SidebarDocument } from "@/components/workspace/DocumentSidebar";

interface CompletionDashboardProps {
  documents: SidebarDocument[];
  firstName: string;
  occupationTitle: string;
  anzscoCode: string;
  onDownload: () => void;
  isDownloading: boolean;
}

export function CompletionDashboard({
  documents,
  firstName,
  occupationTitle,
  anzscoCode,
  onDownload,
  isDownloading,
}: CompletionDashboardProps) {
  const approvedCount = documents.filter((d) => d.status === "approved").length;

  return (
    <div
      className="flex flex-col items-center justify-center gap-8 px-6 py-12 max-w-lg mx-auto"
      data-testid="completion-dashboard"
    >
      {/* Success header */}
      <div className="text-center space-y-3">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "oklch(0.72 0.17 155 / 0.15)" }}
        >
          <CheckCircle2
            className="h-8 w-8"
            style={{ color: "oklch(0.72 0.17 155)" }}
          />
        </div>
        <h2 className="font-display text-2xl italic text-foreground">
          Your package is ready{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All {approvedCount} documents have been approved and are ready for download.
        </p>
      </div>

      {/* Document manifest */}
      <div className="glass-card w-full rounded-xl p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Package Contents
        </p>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2.5">
              <CheckCircle2
                className="h-4 w-4 shrink-0"
                style={{ color: "oklch(0.72 0.17 155)" }}
              />
              <span className="text-sm text-foreground">{doc.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">PDF + DOCX</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 pt-1 border-t border-border/20">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground">Package Cover Sheet</span>
            <span className="text-[10px] text-muted-foreground ml-auto">PDF</span>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="glass-card w-full rounded-xl p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next Steps
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            <span className="text-foreground font-medium">Print reference letters on company letterhead</span> and
            have them signed by your manager or HR
          </li>
          <li>
            <span className="text-foreground font-medium">Gather supporting documents</span> listed in your
            Document Checklist (passport, transcripts, payslips)
          </li>
          <li>
            <span className="text-foreground font-medium">Combine into a single PDF</span> (max 3MB, not encrypted)
            and submit at <span className="text-primary">acs.org.au</span>
          </li>
          <li>
            <span className="text-foreground font-medium">ACS application fee:</span> AUD $1,498
          </li>
        </ol>
      </div>

      {/* ANZSCO badge */}
      <p className="text-xs text-muted-foreground text-center">
        {occupationTitle} (ANZSCO {anzscoCode})
      </p>

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="glow-primary flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110 hover:shadow-xl disabled:opacity-50"
        data-testid="completion-download-btn"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isDownloading ? "Generating Package..." : "Download Package (PDF + DOCX)"}
      </button>
    </div>
  );
}

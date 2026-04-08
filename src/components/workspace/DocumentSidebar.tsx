"use client";

/**
 * Zone 1: Left navigation sidebar for workspace.
 * Shows logo, occupation badge, document list with status dots,
 * progress indicator, and download button.
 * Collapses to hamburger on mobile. [DocGen Brief 2.2]
 */

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Loader2,
  Menu,
  X,
  Circle,
  CheckCircle2,
  Clock,
  Check,
} from "lucide-react";

export type DocumentStatus = "not_started" | "in_progress" | "approved";

export interface SidebarDocument {
  id: string;
  label: string;
  type: string;
  status: DocumentStatus;
}

interface DocumentSidebarProps {
  occupationTitle: string;
  anzscoCode: string;
  assessingAuthority: string;
  documents: SidebarDocument[];
  onDocumentClick?: (docType: string) => void;
  onDownloadAll?: () => void;
  isDownloading?: boolean;
  allComplete?: boolean;
  lastSavedAt?: number | null;
}

function getStatusIcon(status: DocumentStatus) {
  switch (status) {
    case "approved":
      return (
        <CheckCircle2
          className="h-3.5 w-3.5"
          style={{ color: "oklch(0.72 0.17 155)" }}
        />
      );
    case "in_progress":
      return (
        <Clock
          className="h-3.5 w-3.5"
          style={{ color: "oklch(0.78 0.12 70)" }}
        />
      );
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />;
  }
}

function getStatusDotColor(status: DocumentStatus): string {
  switch (status) {
    case "approved":
      return "oklch(0.72 0.17 155)";
    case "in_progress":
      return "oklch(0.78 0.12 70)";
    default:
      return "oklch(0.50 0.02 260 / 0.3)";
  }
}

export function DocumentSidebar({
  occupationTitle,
  anzscoCode,
  assessingAuthority,
  documents,
  onDocumentClick,
  onDownloadAll,
  isDownloading = false,
  allComplete = false,
  lastSavedAt,
}: DocumentSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Flash "Saved" indicator when lastSavedAt changes
  useEffect(() => {
    if (!lastSavedAt) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  const completedCount = documents.filter((d) => d.status === "approved").length;
  const totalCount = documents.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <span
          className="font-display text-lg italic tracking-tight"
          style={{ color: "oklch(0.62 0.17 250)" }}
        >
          imminash
        </span>
      </div>

      {/* Occupation badge */}
      <div className="px-5 pb-4">
        <div
          className="rounded-xl p-3 space-y-1"
          style={{
            background: "oklch(0.62 0.17 250 / 0.08)",
            border: "1px solid oklch(0.62 0.17 250 / 0.15)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {assessingAuthority || "Assessment"}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {occupationTitle || "Occupation"}
          </p>
          {anzscoCode && (
            <p className="text-[11px] text-muted-foreground">
              ANZSCO {anzscoCode}
            </p>
          )}
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Documents
        </p>
        <div className="space-y-0.5">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onDocumentClick?.(doc.type)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary/50"
            >
              {getStatusIcon(doc.status)}
              <span
                className={`flex-1 truncate ${
                  doc.status === "approved"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {doc.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-5 py-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Submission Readiness</span>
          <div className="flex items-center gap-2">
            {showSaved && (
              <span
                className="flex items-center gap-1 text-[10px] font-medium animate-in fade-in duration-300"
                style={{ color: "oklch(0.72 0.17 155)" }}
              >
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            <span className="font-medium text-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background:
                progressPct === 100
                  ? "oklch(0.72 0.17 155)"
                  : "oklch(0.62 0.17 250)",
            }}
          />
        </div>
      </div>

      {/* Download button */}
      <div className="px-5 pb-5">
        <button
          onClick={onDownloadAll}
          disabled={!allComplete || isDownloading}
          className="glow-primary flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          data-testid="sidebar-download-btn"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isDownloading ? "Generating..." : "Download All"}
        </button>
        {!allComplete && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Complete all documents to download
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/80 backdrop-blur-sm border border-border/30"
        aria-label="Open sidebar"
        data-testid="sidebar-hamburger"
      >
        <Menu className="h-4 w-4 text-foreground" />
      </button>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 h-full border-r border-border/30 bg-background"
        data-testid="document-sidebar"
      >
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-background shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary/50"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

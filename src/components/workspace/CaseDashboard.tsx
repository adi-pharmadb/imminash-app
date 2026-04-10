"use client";

/**
 * Case Dashboard: hero panel shown in Zone 2 before the user
 * sends their first message. Shows ANZSCO badge, ACS pathway,
 * CV upload drop zone, and "Or skip" link.
 * Collapses to a compact bar after first user message.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, ChevronRight } from "lucide-react";

interface CaseDashboardProps {
  occupationTitle: string;
  anzscoCode: string;
  assessingAuthority: string;
  collapsed: boolean;
  onFileUpload?: (file: File) => void;
  onSkip?: () => void;
}

function getACSPathway(assessingAuthority: string): string | null {
  const upper = assessingAuthority.toUpperCase().trim();
  if (upper === "ACS" || upper.includes("AUSTRALIAN COMPUTER SOCIETY")) {
    return "General Skills Assessment";
  }
  return null;
}

export function CaseDashboard({
  occupationTitle,
  anzscoCode,
  assessingAuthority,
  collapsed,
  onFileUpload,
  onSkip,
}: CaseDashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && onFileUpload) {
        onFileUpload(file);
      }
    },
    [onFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileUpload) {
        onFileUpload(file);
      }
    },
    [onFileUpload],
  );

  const pathway = getACSPathway(assessingAuthority);

  // Compact bar after first message
  if (collapsed) {
    return (
      <div
        className="flex items-center gap-3 border-b border-border/30 px-5 py-2.5"
        data-testid="case-dashboard-compact"
      >
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            background: "oklch(0.62 0.17 250 / 0.08)",
            color: "oklch(0.62 0.17 250)",
          }}
        >
          <span>{anzscoCode}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-foreground">{occupationTitle}</span>
        </div>
        {pathway && (
          <span className="text-[10px] text-muted-foreground">{pathway}</span>
        )}
      </div>
    );
  }

  // Full dashboard (before first message)
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 px-6 py-10"
      data-testid="case-dashboard"
    >
      {/* ANZSCO badge */}
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: "oklch(0.62 0.17 250 / 0.08)",
            border: "1px solid oklch(0.62 0.17 250 / 0.2)",
            color: "oklch(0.62 0.17 250)",
          }}
        >
          <FileText className="h-4 w-4" />
          ANZSCO {anzscoCode}
        </div>
        <h2 className="font-display text-xl text-foreground">
          {occupationTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {assessingAuthority} Skills Assessment
        </p>
      </div>

      {/* ACS pathway card */}
      {pathway && (
        <div
          className="glass-card w-full max-w-sm rounded-xl p-4 text-center space-y-1"
          data-testid="pathway-card"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Assessment Pathway
          </p>
          <p className="text-sm font-semibold text-foreground">{pathway}</p>
          <p className="text-xs text-muted-foreground">
            ICT Major, Minor, or RPL pathway will be determined based on your qualifications
          </p>
        </div>
      )}

      {/* CV upload drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-sm cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/40 hover:border-primary/40 hover:bg-primary/3"
        }`}
        data-testid="cv-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload
          className={`mx-auto h-8 w-8 mb-3 ${
            isDragging ? "text-primary" : "text-muted-foreground/40"
          }`}
        />
        <p className="text-sm font-medium text-foreground">
          Drop your CV here
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF or Word. I'll extract your employment history automatically.
        </p>
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="skip-cv-upload"
      >
        Or start without a CV
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

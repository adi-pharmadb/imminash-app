"use client";

/**
 * Split-panel workspace layout.
 * Desktop: side-by-side panels (chat left, application form / documents right).
 * Mobile (<768px): stacked vertically with toggle button. [AC-DW6]
 *
 * For ACS assessments: right panel shows the ACS application form simulator.
 * For other bodies: right panel shows document tabs (original behavior).
 */

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DocumentPanel } from "@/components/workspace/DocumentPanel";
import { ACSApplicationPanel } from "@/components/workspace/ACSApplicationPanel";
import { MobileToggle } from "@/components/workspace/MobileToggle";
import { isACSBody } from "@/lib/workspace-helpers";
import type { ChatMessage } from "@/lib/workspace-helpers";
import type { DocumentUpdate, ACSFormUpdate } from "@/lib/duty-alignment";
import type { Document as DbDocument, AssessingBodyRequirement } from "@/types/database";
import type { ACSApplicationData, ACSSection } from "@/types/acs-application";
import { createEmptyACSApplication } from "@/types/acs-application";

interface WorkspaceLayoutProps {
  initialMessages: ChatMessage[];
  initialDocuments: DbDocument[];
  assessmentId: string;
  documentTabs: string[];
  assessingBody: AssessingBodyRequirement | null;
  assessingAuthority: string;
  initialACSData?: ACSApplicationData;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export function WorkspaceLayout({
  initialMessages,
  initialDocuments,
  assessmentId,
  documentTabs,
  assessingBody,
  assessingAuthority,
  initialACSData,
  onMessagesChange,
}: WorkspaceLayoutProps) {
  const isACS = isACSBody(assessingAuthority);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [documents, setDocuments] = useState<DbDocument[]>(initialDocuments);
  const [mobileView, setMobileView] = useState<"chat" | "documents">("chat");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // ACS-specific state
  const [acsData, setAcsData] = useState<ACSApplicationData>(
    initialACSData || createEmptyACSApplication(),
  );
  const [highlightedSection, setHighlightedSection] = useState<ACSSection | null>(null);

  const handleMessagesChange = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      onMessagesChange?.(newMessages);
    },
    [onMessagesChange],
  );

  // Handle ACS form updates from AI responses
  const handleACSFormUpdates = useCallback(
    (updates: ACSFormUpdate[]) => {
      setAcsData((prev) => {
        const next = { ...prev };

        for (const update of updates) {
          try {
            const parsed = JSON.parse(update.content);
            const section = update.section as ACSSection;

            switch (section) {
              case "personal_details":
                next.personalDetails = { ...next.personalDetails, ...parsed };
                break;
              case "anzsco_code":
                next.anzscoCode = { ...next.anzscoCode, ...parsed };
                break;
              case "upload_history":
                if (parsed.items) {
                  next.uploadHistory = { items: parsed.items };
                }
                break;
              case "qualifications":
                if (parsed.entries) {
                  next.qualifications = { entries: parsed.entries };
                }
                break;
              case "employment":
                if (parsed.entries) {
                  next.employment = { entries: parsed.entries };
                }
                break;
              case "summary":
                next.summary = { ...next.summary, ...parsed };
                break;
            }

            // Highlight the updated section
            setHighlightedSection(section);
            setTimeout(() => setHighlightedSection(null), 3000);
          } catch (e) {
            console.error("Failed to parse ACS form update:", e);
          }
        }

        return next;
      });
    },
    [],
  );

  const handleDocumentUpdates = useCallback(
    (updates: DocumentUpdate[]) => {
      setDocuments((prev) => {
        const next = [...prev];
        for (const update of updates) {
          const existingIndex = next.findIndex(
            (d) => d.document_type === update.documentType,
          );

          let parsedContent: Record<string, unknown>;
          try {
            parsedContent = JSON.parse(update.content);
          } catch {
            parsedContent = { raw: update.content };
          }

          if (existingIndex >= 0) {
            next[existingIndex] = {
              ...next[existingIndex],
              content: parsedContent,
              updated_at: new Date().toISOString(),
            };
          } else {
            next.push({
              id: `local-${Date.now()}-${update.documentType}`,
              assessment_id: assessmentId,
              user_id: null,
              document_type: update.documentType,
              title: update.documentType.replace(/_/g, " "),
              content: parsedContent,
              storage_path: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        return next;
      });
    },
    [assessmentId],
  );

  const handleDownloadAll = useCallback(async () => {
    if (isDownloadingAll) return;

    setIsDownloadingAll(true);
    try {
      const response = await fetch(
        `/api/documents/${assessmentId}/download-all`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(`Download-all failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-${assessmentId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download-all error:", error);
    } finally {
      setIsDownloadingAll(false);
    }
  }, [assessmentId, isDownloadingAll]);

  const hasDocuments = documents.some((d) => d.content !== null);

  return (
    <div className="flex h-screen flex-col bg-background" data-testid="workspace-layout">
      {/* Workspace header */}
      <div
        className="glass-card flex items-center justify-between border-b border-border/50 px-5 py-2.5"
        data-testid="workspace-header"
      >
        <div className="flex items-center gap-3">
          <span className="font-display text-lg italic tracking-tight text-foreground/80">
            imminash
          </span>
          {isACS && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: "oklch(0.78 0.12 70 / 0.15)",
                color: "oklch(0.78 0.12 70)",
              }}
            >
              ACS Assessment
            </span>
          )}
        </div>

        {!isACS && hasDocuments && (
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="glow-amber inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
            data-testid="download-all-btn"
            aria-label="Download all documents as ZIP"
          >
            {isDownloadingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingAll ? "Generating..." : "Download All"}
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Chat panel */}
        <div
          className={`h-full w-full md:w-1/2 ${
            mobileView === "documents" ? "hidden md:flex" : "flex"
          } flex-col`}
        >
          <ChatPanel
            messages={messages}
            onMessagesChange={handleMessagesChange}
            assessmentId={assessmentId}
            onDocumentUpdates={handleDocumentUpdates}
            onACSFormUpdates={isACS ? handleACSFormUpdates : undefined}
          />
        </div>

        {/* Subtle divider between panels */}
        <div className="hidden md:flex md:flex-col md:items-center md:justify-center">
          <div className="h-full w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        </div>

        {/* Right panel: ACS form or document viewer */}
        <div
          className={`h-full w-full md:w-1/2 ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          } flex-col`}
        >
          {isACS ? (
            <ACSApplicationPanel
              applicationData={acsData}
              highlightedSection={highlightedSection}
            />
          ) : (
            <DocumentPanel tabs={documentTabs} documents={documents} />
          )}
        </div>

        {/* Mobile toggle [AC-DW6] */}
        <MobileToggle
          activeView={mobileView}
          onToggle={setMobileView}
          rightLabel={isACS ? "Application" : "Documents"}
        />
      </div>
    </div>
  );
}

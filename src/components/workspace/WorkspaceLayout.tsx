"use client";

/**
 * 3-zone workspace layout per DocGen Brief 2.1/2.2.
 * Zone 1 (left nav ~220px): Logo, occupation badge, document list, progress, download.
 * Zone 2 (chat): Main chat panel, takes remaining width by default.
 * Zone 3 (document preview): Appears when AI triggers doc review, takes 50% of Zone 2.
 *
 * 4 screen states:
 * - Default: chat only (Zone 1 + Zone 2)
 * - Split: chat + preview (Zone 1 + Zone 2 + Zone 3)
 * - Approved: collapse preview back to chat only
 * - All Complete: download button active in Zone 1
 *
 * Mobile: Zone 1 collapses to hamburger, Zone 3 opens as fullscreen modal.
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { X, Check, MessageSquare } from "lucide-react";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DocumentPanel } from "@/components/workspace/DocumentPanel";
import { ACSApplicationPanel } from "@/components/workspace/ACSApplicationPanel";
import {
  DocumentSidebar,
  type SidebarDocument,
  type DocumentStatus,
} from "@/components/workspace/DocumentSidebar";
import { isACSBody, formatDocumentType } from "@/lib/workspace-helpers";
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
  occupationTitle?: string;
  anzscoCode?: string;
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
  occupationTitle = "",
  anzscoCode = "",
  initialACSData,
  onMessagesChange,
}: WorkspaceLayoutProps) {
  const isACS = isACSBody(assessingAuthority);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [documents, setDocuments] = useState<DbDocument[]>(initialDocuments);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Zone 3 visibility state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<string | null>(null);

  // Track approved documents
  const [approvedDocTypes, setApprovedDocTypes] = useState<Set<string>>(new Set());

  // ACS-specific state
  const [acsData, setAcsData] = useState<ACSApplicationData>(
    initialACSData || createEmptyACSApplication(),
  );
  const [highlightedSection, setHighlightedSection] = useState<ACSSection | null>(null);

  // Derive sidebar document list from documentTabs + actual documents
  const sidebarDocs: SidebarDocument[] = useMemo(() => {
    return documentTabs.map((tab) => {
      const docType = tab
        .toLowerCase()
        .replace(/[\s/]+/g, "_")
        .replace(/[()]/g, "");

      const matchedDoc = documents.find((d) => {
        const dt = d.document_type.toLowerCase();
        return dt === docType || dt.includes(docType.split("_")[0]);
      });

      let status: DocumentStatus = "not_started";
      if (approvedDocTypes.has(docType)) {
        status = "approved";
      } else if (matchedDoc?.content) {
        status = "in_progress";
      }

      return {
        id: matchedDoc?.id || `pending-${docType}`,
        label: tab,
        type: docType,
        status,
      };
    });
  }, [documentTabs, documents, approvedDocTypes]);

  const allComplete = sidebarDocs.length > 0 && sidebarDocs.every((d) => d.status === "approved");
  const hasDocuments = documents.some((d) => d.content !== null);

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

      // Open preview when ACS form gets updated
      setPreviewOpen(true);
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

      // Open preview when documents get updated
      if (updates.length > 0) {
        setPreviewDocType(updates[0].documentType);
        setPreviewOpen(true);
      }
    },
    [assessmentId],
  );

  // Chat input placeholder override for "Request changes" flow
  const [chatPlaceholder, setChatPlaceholder] = useState<string | undefined>();

  const handleDocumentClick = useCallback((docType: string) => {
    setPreviewDocType(docType);
    setPreviewOpen(true);
  }, []);

  /** Approve the currently previewed document: turn dot green, collapse Zone 3 */
  const handleApproveDocument = useCallback(() => {
    if (!previewDocType) return;

    setDocuments((prev) => {
      const next = [...prev];
      const idx = next.findIndex((d) => d.document_type === previewDocType);
      if (idx >= 0) {
        next[idx] = { ...next[idx], updated_at: new Date().toISOString() };
      }
      return next;
    });

    // Mark the sidebar doc as approved by updating its status via a state bump
    // The sidebar derives status from documents, so we need to signal "approved"
    // We'll store approved doc types in a set
    setApprovedDocTypes((prev) => new Set([...prev, previewDocType]));
    setPreviewOpen(false);
    setPreviewDocType(null);
  }, [previewDocType]);

  /** Request changes: close preview, refocus chat with placeholder */
  const handleRequestChanges = useCallback(() => {
    setPreviewOpen(false);
    setChatPlaceholder("Describe what you'd like to change...");
    // Clear the placeholder after user starts typing (handled in ChatPanel)
    setTimeout(() => setChatPlaceholder(undefined), 10000);
  }, []);

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

  return (
    <div className="flex h-screen bg-background" data-testid="workspace-layout">
      {/* Zone 1: Left navigation sidebar */}
      <DocumentSidebar
        occupationTitle={occupationTitle}
        anzscoCode={anzscoCode}
        assessingAuthority={assessingAuthority}
        documents={sidebarDocs}
        onDocumentClick={handleDocumentClick}
        onDownloadAll={handleDownloadAll}
        isDownloading={isDownloadingAll}
        allComplete={allComplete || hasDocuments}
      />

      {/* Zone 2: Chat panel (takes remaining width, or splits with Zone 3) */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          previewOpen ? "md:w-1/2" : ""
        }`}
      >
        <ChatPanel
          messages={messages}
          onMessagesChange={handleMessagesChange}
          assessmentId={assessmentId}
          onDocumentUpdates={handleDocumentUpdates}
          onACSFormUpdates={isACS ? handleACSFormUpdates : undefined}
          placeholderOverride={chatPlaceholder}
        />
      </div>

      {/* Zone 3: Document preview (appears when triggered, 50% width on desktop) */}
      {previewOpen && (
        <>
          {/* Desktop: inline panel */}
          <div className="hidden md:flex md:flex-col md:w-1/2 border-l border-border/30 relative">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary transition-colors"
              aria-label="Close preview"
              data-testid="close-preview"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 overflow-hidden">
              {isACS ? (
                <ACSApplicationPanel
                  applicationData={acsData}
                  highlightedSection={highlightedSection}
                />
              ) : (
                <DocumentPanel tabs={documentTabs} documents={documents} />
              )}
            </div>
            {/* Approve / Request Changes buttons */}
            <div className="flex items-center gap-3 border-t border-border/30 px-4 py-3">
              <button
                onClick={handleApproveDocument}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "oklch(0.72 0.17 155)", color: "oklch(0.13 0.01 260)" }}
                data-testid="approve-document"
              >
                <Check className="h-4 w-4" />
                Approve this document
              </button>
              <button
                onClick={handleRequestChanges}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border/50 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary/50"
                data-testid="request-changes"
              >
                <MessageSquare className="h-4 w-4" />
                Request changes
              </button>
            </div>
          </div>

          {/* Mobile: fullscreen modal */}
          <div className="fixed inset-0 z-40 flex flex-col bg-background md:hidden">
            <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                Document Preview
              </span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary/50"
                aria-label="Close preview"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {isACS ? (
                <ACSApplicationPanel
                  applicationData={acsData}
                  highlightedSection={highlightedSection}
                />
              ) : (
                <DocumentPanel tabs={documentTabs} documents={documents} />
              )}
            </div>
            {/* Mobile Approve / Request Changes buttons */}
            <div className="flex items-center gap-3 border-t border-border/30 px-4 py-3 pb-safe">
              <button
                onClick={handleApproveDocument}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "oklch(0.72 0.17 155)", color: "oklch(0.13 0.01 260)" }}
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={handleRequestChanges}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border/50 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary/50"
              >
                <MessageSquare className="h-4 w-4" />
                Request changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

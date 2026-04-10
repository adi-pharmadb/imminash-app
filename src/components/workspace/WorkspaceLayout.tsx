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
 *
 * Dynamic sidebar: employer names are extracted from conversation messages
 * and used to replace the generic "Reference Letter(s)" entry with
 * individual "Ref Letter -- [Employer]" entries.
 */

import { useState, useCallback, useMemo } from "react";
import { X, Check, MessageSquare } from "lucide-react";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DocumentPanel } from "@/components/workspace/DocumentPanel";
import { ACSApplicationPanel } from "@/components/workspace/ACSApplicationPanel";
import {
  DocumentSidebar,
  type SidebarDocument,
  type DocumentStatus,
} from "@/components/workspace/DocumentSidebar";
import { FactCheckDeclaration } from "@/components/workspace/FactCheckDeclaration";
import { CompletionDashboard } from "@/components/workspace/CompletionDashboard";
import { ReferralPrompt } from "@/components/workspace/ReferralPrompt";
import { isACSBody, formatDocumentType } from "@/lib/workspace-helpers";
import type { ChatMessage } from "@/lib/workspace-helpers";
import type { DocumentUpdate, ACSFormUpdate } from "@/lib/duty-alignment";
import { extractEmployersFromMessages } from "@/lib/duty-alignment";
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
  initialCvData?: Record<string, unknown> | null;
  firstName?: string;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

/**
 * Default sidebar items shown before any employers are discovered.
 * "Reference Letter(s) (number TBC)" is the placeholder that gets
 * replaced once employer names are collected from the conversation.
 */
const DEFAULT_NON_REF_DOCS = [
  "Supporting Statement",
  "CPD Log",
  "Document Checklist",
];

const REF_LETTER_PLACEHOLDER = "Reference Letter(s) (number TBC)";

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
  initialCvData,
  firstName = "",
  onMessagesChange,
}: WorkspaceLayoutProps) {
  const isACS = isACSBody(assessingAuthority);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [documents, setDocuments] = useState<DbDocument[]>(initialDocuments);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Zone 3 visibility state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<string | null>(null);

  // Derive approved doc types from documents' DB status (no in-memory tracking)
  const approvedDocTypes = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.status === "approved") {
        set.add(doc.document_type);
      }
    }
    return set;
  }, [documents]);

  // CV data state (persisted to assessments.cv_data)
  const [cvData, setCvData] = useState<Record<string, unknown> | null>(initialCvData || null);

  // ACS-specific state
  const [acsData, setAcsData] = useState<ACSApplicationData>(
    initialACSData || createEmptyACSApplication(),
  );
  const [highlightedSection, setHighlightedSection] = useState<ACSSection | null>(null);

  // Extract employer names from conversation messages
  const employerNames = useMemo(() => {
    return extractEmployersFromMessages(messages);
  }, [messages]);

  /**
   * Build the dynamic sidebar document list.
   * - If no employers discovered yet, show the placeholder "Reference Letter(s) (number TBC)"
   * - Once employers appear, replace with individual "Ref Letter -- [Employer]" entries
   * - Always include Supporting Statement, CPD Log, Document Checklist
   */
  const sidebarDocs: SidebarDocument[] = useMemo(() => {
    const items: SidebarDocument[] = [];

    // Reference letter entries
    if (employerNames.length === 0) {
      // No employers yet -- show placeholder
      const docType = "reference_letters_tbc";
      items.push({
        id: `pending-${docType}`,
        label: REF_LETTER_PLACEHOLDER,
        type: docType,
        status: "not_started",
      });
    } else {
      // Individual reference letter per employer
      for (const employer of employerNames) {
        const slug = employer
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
        const legacyDocType = `reference_letter_${slug}`;
        const newDocType = `employment_reference_${slug}`;

        // Match both legacy reference_letter_* and new employment_reference_* formats
        const matchedDoc = documents.find(
          (d) => d.document_type === legacyDocType || d.document_type === newDocType,
        );
        const docType = matchedDoc?.document_type || newDocType;

        let status: DocumentStatus = "not_started";
        if (approvedDocTypes.has(docType)) {
          status = "approved";
        } else if (matchedDoc?.content) {
          status = "in_progress";
        }

        items.push({
          id: matchedDoc?.id || `pending-${docType}`,
          label: `Ref Letter -- ${employer}`,
          type: docType,
          status,
        });
      }
    }

    // Non-reference documents
    for (const label of DEFAULT_NON_REF_DOCS) {
      const docType = label
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

      items.push({
        id: matchedDoc?.id || `pending-${docType}`,
        label,
        type: docType,
        status,
      });
    }

    return items;
  }, [employerNames, documents, approvedDocTypes]);

  /**
   * For ACS bodies, fall back to the original tab-based sidebar logic
   * since ACS has its own form-based flow.
   */
  const acsSidebarDocs: SidebarDocument[] = useMemo(() => {
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

  const activeSidebarDocs = isACS ? acsSidebarDocs : sidebarDocs;

  const allComplete =
    activeSidebarDocs.length > 0 &&
    activeSidebarDocs.every((d) => d.status === "approved");
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

  // Handle CV data received from upload
  const handleCVDataReceived = useCallback(async (data: Record<string, unknown>) => {
    setCvData(data);
    // Persist to DB
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("assessments")
        .update({ cv_data: data })
        .eq("id", assessmentId);
    } catch (e) {
      console.error("Failed to persist CV data:", e);
    }
  }, [assessmentId]);

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
              status: "draft",
              declaration_confirmed_at: null,
              declaration_text: null,
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
        setLastSavedAt(Date.now());
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

  /** Approve the currently previewed document: persist to DB, turn dot green, collapse Zone 3 */
  const handleApproveDocument = useCallback(async () => {
    if (!previewDocType) return;

    // Optimistically update local state
    setDocuments((prev) => {
      const next = [...prev];
      const idx = next.findIndex((d) => d.document_type === previewDocType);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          status: "approved",
          updated_at: new Date().toISOString(),
        };
      }
      return next;
    });

    // Brief delay before collapsing to let the user see the approval
    setTimeout(() => {
      setPreviewOpen(false);
      setPreviewDocType(null);
    }, 500);

    // Persist approval to DB
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const doc = documents.find((d) => d.document_type === previewDocType);
      if (doc && !doc.id.startsWith("local-")) {
        await supabase
          .from("documents")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", doc.id);
      }
    } catch (e) {
      console.error("Failed to persist document approval:", e);
    }
  }, [previewDocType, documents]);

  /** Request changes: close preview, refocus chat with placeholder */
  const handleRequestChanges = useCallback(() => {
    setPreviewOpen(false);
    setChatPlaceholder("Describe what you'd like to change...");
    setTimeout(() => setChatPlaceholder(undefined), 10000);
  }, []);

  /** Handle text-selection revision request from DocumentPanel */
  const handleRevisionRequest = useCallback((selectedText: string) => {
    // Inject a revision request message into the chat
    const revisionMsg: ChatMessage = {
      role: "user",
      content: `Please revise this section of the document:\n\n"${selectedText}"\n\nMake it more specific and SFIA-aligned for the ACS assessment.`,
    };
    setMessages((prev) => [...prev, revisionMsg]);
    setPreviewOpen(false);
    setChatPlaceholder(undefined);
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

      // Show referral prompt after successful download
      setReferralOpen(true);
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
        documents={activeSidebarDocs}
        onDocumentClick={handleDocumentClick}
        onDownloadAll={handleDownloadAll}
        isDownloading={isDownloadingAll}
        allComplete={allComplete}
        lastSavedAt={lastSavedAt}
      />

      {/* Zone 2: Chat panel or Completion Dashboard */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          previewOpen ? "md:w-1/2" : ""
        }`}
      >
        {allComplete ? (
          <CompletionDashboard
            documents={activeSidebarDocs}
            firstName={firstName}
            occupationTitle={occupationTitle}
            anzscoCode={anzscoCode}
            onDownload={handleDownloadAll}
            isDownloading={isDownloadingAll}
          />
        ) : (
        <ChatPanel
          messages={messages}
          onMessagesChange={handleMessagesChange}
          assessmentId={assessmentId}
          onDocumentUpdates={handleDocumentUpdates}
          onACSFormUpdates={isACS ? handleACSFormUpdates : undefined}
          placeholderOverride={chatPlaceholder}
          cvData={cvData}
          onCVDataReceived={handleCVDataReceived}
          occupationTitle={occupationTitle}
          anzscoCode={anzscoCode}
          assessingAuthority={assessingAuthority}
        />
        )}
      </div>

      {/* Zone 3: Document preview (appears when triggered, 50% width on desktop) */}
      {previewOpen && (
        <>
          {/* Desktop: slide-in panel */}
          <div className="hidden md:flex md:flex-col md:w-1/2 border-l border-border/30 relative transition-all duration-300 animate-in slide-in-from-right">
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
                <DocumentPanel tabs={documentTabs} documents={documents} onRevisionRequest={handleRevisionRequest} />
              )}
            </div>
            {/* Approve / Request Changes footer */}
            <div className="border-t border-border/30 px-4 py-3 space-y-3">
              {/* Fact-check declaration for reference letters */}
              {previewDocType && (previewDocType.includes("reference") || previewDocType.includes("employment_reference")) ? (
                <FactCheckDeclaration
                  employerNames={previewDocType ? [
                    // Extract employer name from doc type slug
                    previewDocType
                      .replace(/^(reference_letter_|employment_reference_)/, "")
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" "),
                  ] : []}
                  onAllConfirmed={handleApproveDocument}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApproveDocument}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-110"
                    style={{ background: "var(--success)", color: "var(--primary-foreground)" }}
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
              )}
              {/* Request changes always available */}
              {previewDocType && (previewDocType.includes("reference") || previewDocType.includes("employment_reference")) && (
                <button
                  onClick={handleRequestChanges}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary/50"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Request changes instead
                </button>
              )}
            </div>
          </div>

          {/* Mobile: backdrop + bottom sheet (70vh) */}
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden animate-in fade-in duration-200"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col bg-background rounded-t-2xl shadow-2xl md:hidden animate-in slide-in-from-bottom duration-300" style={{ height: "70vh" }}>
            {/* Drag handle */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
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
                <DocumentPanel tabs={documentTabs} documents={documents} onRevisionRequest={handleRevisionRequest} />
              )}
            </div>
            {/* Mobile Approve / Request Changes buttons */}
            <div className="flex items-center gap-3 border-t border-border/30 px-4 py-3 pb-safe">
              <button
                onClick={handleApproveDocument}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "var(--success)", color: "var(--primary-foreground)" }}
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

      {/* Post-download referral prompt */}
      <ReferralPrompt open={referralOpen} onOpenChange={setReferralOpen} />
    </div>
  );
}

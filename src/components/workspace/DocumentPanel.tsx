"use client";

/**
 * Right panel: tabbed document viewer.
 * Documents are VIEW-ONLY -- no contentEditable, no text inputs. [AC-DW5]
 * Tabs are derived from the assessing body's required_documents. [AC-DW2]
 * Changed sections are highlighted when content updates. [AC-DW4]
 * Individual document download (PDF/DOCX) per tab. [AC-DD1, AC-DD2]
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, FileText, FileSpreadsheet, Loader2, Eye, EyeOff } from "lucide-react";
import { RevisionPopover } from "@/components/workspace/RevisionPopover";
import type { Document as DbDocument } from "@/types/database";
import { formatDocumentType } from "@/lib/workspace-helpers";

interface DocumentPanelProps {
  tabs: string[];
  documents: DbDocument[];
  onRevisionRequest?: (selectedText: string) => void;
}

/**
 * Render document content as formatted HTML.
 * Handles JSON objects, raw strings, and nested structures.
 */
function renderDocumentContent(content: Record<string, unknown> | null): string {
  if (!content) {
    return "<p class='text-muted-foreground/60 font-display text-lg'>No content yet. Start chatting to generate this document.</p>";
  }

  // If content has a "raw" key (fallback from unparsed AI response)
  if (typeof content.raw === "string") {
    return `<div class="whitespace-pre-wrap">${escapeHtml(content.raw)}</div>`;
  }

  const sections: string[] = [];

  for (const [key, value] of Object.entries(content)) {
    const label = formatDocumentType(key);

    if (Array.isArray(value)) {
      const items = value
        .map((item) => `<li class="ml-4 list-disc">${escapeHtml(String(item))}</li>`)
        .join("");
      sections.push(`<div class="mb-6"><h4 class="font-semibold text-foreground mb-2 text-base">${escapeHtml(label)}</h4><ul class="space-y-1.5 text-foreground/80">${items}</ul></div>`);
    } else if (typeof value === "object" && value !== null) {
      const nested = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `<p class="text-foreground/80"><span class="font-medium text-foreground">${escapeHtml(formatDocumentType(k))}:</span> ${escapeHtml(String(v))}</p>`)
        .join("");
      sections.push(`<div class="mb-6"><h4 class="font-semibold text-foreground mb-2 text-base">${escapeHtml(label)}</h4>${nested}</div>`);
    } else {
      sections.push(`<div class="mb-6"><h4 class="font-semibold text-foreground mb-2 text-base">${escapeHtml(label)}</h4><p class="text-foreground/80">${escapeHtml(String(value))}</p></div>`);
    }
  }

  return sections.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function DocumentPanel({ tabs, documents, onRevisionRequest }: DocumentPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [highlightedTab, setHighlightedTab] = useState<number | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [xRayMode, setXRayMode] = useState(false);
  const prevDocumentsRef = useRef<string>("");
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Detect content changes and highlight [AC-DW4]
  useEffect(() => {
    const currentSnapshot = JSON.stringify(documents.map((d) => d.content));
    if (prevDocumentsRef.current && prevDocumentsRef.current !== currentSnapshot) {
      // Find which document type changed
      const prevDocs = JSON.parse(prevDocumentsRef.current) as Array<Record<string, unknown> | null>;
      documents.forEach((doc, i) => {
        const prevContent = JSON.stringify(prevDocs[i] ?? null);
        const currContent = JSON.stringify(doc.content);
        if (prevContent !== currContent) {
          const tabIndex = tabs.findIndex(
            (t) => t.toLowerCase().replace(/[\s/]/g, "_") === doc.document_type ||
              formatDocumentType(doc.document_type).toLowerCase() === t.toLowerCase(),
          );
          if (tabIndex >= 0) {
            setHighlightedTab(tabIndex);
            setActiveTab(tabIndex);
          }
        }
      });
    }
    prevDocumentsRef.current = currentSnapshot;
  }, [documents, tabs]);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightedTab !== null) {
      const timer = setTimeout(() => setHighlightedTab(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTab]);

  // Find the document matching the active tab
  const activeTabLabel = tabs[activeTab] || tabs[0];
  const activeDocType = activeTabLabel
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/[()]/g, "");

  const activeDocument = documents.find((doc) => {
    const docType = doc.document_type.toLowerCase();
    return (
      docType === activeDocType ||
      docType.includes(activeDocType.split("_")[0])
    );
  });

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      if (!activeDocument || downloadingFormat) return;

      setDownloadingFormat(format);
      try {
        const response = await fetch(
          `/api/documents/download/${activeDocument.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format }),
          },
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeDocument.title || activeDocument.document_type}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download error:", error);
      } finally {
        setDownloadingFormat(null);
      }
    },
    [activeDocument, downloadingFormat],
  );

  return (
    <div
      className="flex h-full flex-col bg-background"
      data-testid="document-panel"
    >
      {/* Tab bar - premium with amber active indicator */}
      <div className="flex overflow-x-auto border-b border-border/30" data-testid="document-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`relative whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wide transition-colors ${
              i === activeTab
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            } ${i === highlightedTab ? "animate-pulse-glow" : ""}`}
            onClick={() => setActiveTab(i)}
            data-testid={`doc-tab-${i}`}
          >
            {tab}
            {/* Active tab amber underline */}
            {i === activeTab && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.78_0.12_70_/_0.4)]" />
            )}
          </button>
        ))}
      </div>

      {/* X-Ray toggle + Download toolbar */}
      {activeDocument?.content && (
        <div className="flex items-center gap-2 mx-3 mt-3">
          <button
            onClick={() => setXRayMode(!xRayMode)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              xRayMode
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
            data-testid="xray-toggle"
          >
            {xRayMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {xRayMode ? "X-Ray View" : "Clean View"}
          </button>
        </div>
      )}
      {activeDocument?.content && (
        <div
          className="glass-card mx-3 mt-3 flex items-center gap-2 rounded-lg px-4 py-2"
          data-testid="download-toolbar"
        >
          <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            Download:
          </span>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-all hover:border-primary/30 hover:text-foreground disabled:opacity-50"
            data-testid="download-pdf-btn"
            aria-label="Download as PDF"
          >
            {downloadingFormat === "pdf" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            PDF
          </button>
          <button
            onClick={() => handleDownload("docx")}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-all hover:border-primary/30 hover:text-foreground disabled:opacity-50"
            data-testid="download-docx-btn"
            aria-label="Download as DOCX"
          >
            {downloadingFormat === "docx" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3 w-3" />
            )}
            DOCX
          </button>
        </div>
      )}

      {/* Document content - VIEW-ONLY [AC-DW5] - clean editorial typography */}
      <div
        ref={contentAreaRef}
        className="relative flex-1 overflow-y-auto px-5 py-6 md:px-6 lg:px-8"
        data-testid="document-content"
      >
        <RevisionPopover
          containerRef={contentAreaRef}
          onRevisionRequest={onRevisionRequest}
        />
        <div
          className={`prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed ${
            highlightedTab === activeTab
              ? "rounded-xl p-4 ring-1 ring-primary/30 shadow-[0_0_24px_oklch(0.78_0.12_70_/_0.08)] transition-all duration-1000"
              : ""
          } ${xRayMode ? "xray-mode" : ""}`}
          dangerouslySetInnerHTML={{
            __html: renderDocumentContent(activeDocument?.content ?? null),
          }}
        />
        {/* X-Ray mode inline styles */}
        {xRayMode && (
          <style>{`
            .xray-mode li { position: relative; padding-left: 0.5rem; border-left: 3px solid oklch(0.62 0.17 250 / 0.4); margin-bottom: 0.5rem; }
            .xray-mode li::after { content: "ANZSCO duty"; position: absolute; top: 0; right: 0; font-size: 9px; font-weight: 600; color: oklch(0.62 0.17 250); background: oklch(0.62 0.17 250 / 0.08); padding: 1px 6px; border-radius: 4px; }
          `}</style>
        )}
      </div>
    </div>
  );
}

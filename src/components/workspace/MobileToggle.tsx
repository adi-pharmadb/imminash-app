"use client";

/**
 * Mobile toggle to switch between chat and document/application views.
 * Rendered inline in the workspace header on viewports < 768px. [AC-DW6]
 */

import { MessageSquare, FileText } from "lucide-react";

interface MobileToggleProps {
  activeView: "chat" | "documents";
  onToggle: (view: "chat" | "documents") => void;
  rightLabel?: string;
}

export function MobileToggle({ activeView, onToggle, rightLabel = "Docs" }: MobileToggleProps) {
  return (
    <div
      className="flex gap-0.5 rounded-full p-0.5 md:hidden"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--surface-border-subtle)",
      }}
      data-testid="mobile-toggle"
    >
      <button
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          activeView === "chat"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onToggle("chat")}
        aria-label="Show chat"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Chat
      </button>
      <button
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          activeView === "documents"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onToggle("documents")}
        aria-label={`Show ${rightLabel.toLowerCase()}`}
      >
        <FileText className="h-3.5 w-3.5" />
        {rightLabel}
      </button>
    </div>
  );
}

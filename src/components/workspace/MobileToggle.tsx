"use client";

/**
 * Mobile toggle button to switch between chat and document/application views.
 * Only visible on viewports < 768px. [AC-DW6]
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
      className="glass-card glow-amber fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full p-1 shadow-lg md:hidden"
      data-testid="mobile-toggle"
    >
      <button
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
          activeView === "chat"
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onToggle("chat")}
        aria-label="Show chat"
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </button>
      <button
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
          activeView === "documents"
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onToggle("documents")}
        aria-label={`Show ${rightLabel.toLowerCase()}`}
      >
        <FileText className="h-4 w-4" />
        {rightLabel}
      </button>
    </div>
  );
}

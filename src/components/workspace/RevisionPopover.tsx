"use client";

/**
 * Revision Popover: appears when user selects text in the document panel.
 * Offers to send the selection to chat for AI-guided revision.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, X } from "lucide-react";

interface RevisionPopoverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onRevisionRequest?: (selectedText: string) => void;
}

export function RevisionPopover({
  containerRef,
  onRevisionRequest,
}: RevisionPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setVisible(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 10) {
      setVisible(false);
      return;
    }

    // Check that selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectedText(text);
    setPosition({
      top: rect.bottom - containerRect.top + 8,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setVisible(true);
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseUp]);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute z-20 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
      data-testid="revision-popover"
    >
      <div className="glass-card rounded-xl shadow-lg border border-border/30 p-2 flex items-center gap-2">
        <button
          onClick={() => {
            onRevisionRequest?.(selectedText);
            setVisible(false);
            window.getSelection()?.removeAllRanges();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          Revise this section
        </button>
        <button
          onClick={() => setVisible(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

"use client";

/**
 * BottomSheet — mobile-native sliding panel from bottom of viewport.
 *
 * Behaviour:
 *  - Slides up from bottom with a drag handle
 *  - Height is 85dvh by default (leaves a peek of the main content)
 *  - Tap backdrop to dismiss
 *  - Escape key to dismiss
 *  - Optional drag-down-to-dismiss gesture
 *  - Body scroll locked while open
 *  - Respects safe-area-inset-bottom
 *
 * This is only rendered on <lg screens; on desktop the side panels
 * use the original aside layout. Controlled via `open` prop.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sheet height as a fraction of viewport. Default 0.88. */
  heightFraction?: number;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  heightFraction = 0.88,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Mount/unmount for animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Prevent body scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Drag down to dismiss (touch only)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;
    // Only start drag if scrolled to top of the sheet content
    const scrollTop = sheetRef.current.scrollTop;
    if (scrollTop > 0) return;
    touchStartRef.current = e.touches[0].clientY;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || touchStartRef.current === null) return;
    const delta = e.touches[0].clientY - touchStartRef.current;
    if (delta > 0) setDragY(delta);
  };
  const handleTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);
    touchStartRef.current = null;
    // Dismiss if dragged > 120px or > 30% of sheet height
    if (dragY > 120) {
      onClose();
    }
    setDragY(0);
  };

  if (!mounted && !open) return null;

  const heightPct = Math.round(heightFraction * 100);
  const translateY = dragY > 0 ? dragY : 0;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-2xl transition-transform ${
          dragging ? "duration-0" : "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        }`}
        style={{
          height: `${heightPct}dvh`,
          transform: open
            ? `translateY(${translateY}px)`
            : "translateY(100%)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 cursor-grab items-center justify-center py-3 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 pb-3">
            <h2 className="font-serif-premium text-lg font-medium text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

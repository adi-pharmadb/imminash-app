"use client";

/**
 * AppNav — global top navigation for authed pages.
 *
 * Contains:
 *  - Brand wordmark (left)
 *  - Optional panel visibility toggles (chat page only)
 *  - User menu (right) with theme toggle + sign out
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Moon,
  PanelLeft,
  PanelRight,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AppNavProps {
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
}

export function AppNav({
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeft,
  onToggleRight,
}: AppNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("imminash_theme");
    setDark(stored !== "light");
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("imminash_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("imminash_theme", "light");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-md">
      {/* Left: brand + panel toggles */}
      <div className="flex items-center gap-2">
        <span className="font-display text-lg tracking-tight text-foreground select-none">
          imminash
        </span>

        {(onToggleLeft || onToggleRight) && (
          <div className="ml-4 flex items-center gap-1 border-l border-border/40 pl-4">
            {onToggleLeft && (
              <button
                onClick={onToggleLeft}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  leftPanelOpen
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-label={leftPanelOpen ? "Hide left panel" : "Show left panel"}
                title="Toggle left panel"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            {onToggleRight && (
              <button
                onClick={onToggleRight}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  rightPanelOpen
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-label={rightPanelOpen ? "Hide right panel" : "Show right panel"}
                title="Toggle right panel"
              >
                <PanelRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: user menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
          aria-label="Account menu"
          aria-expanded={menuOpen}
        >
          <UserIcon className="h-4 w-4" />
        </button>

        {menuOpen && mounted && (
          <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-secondary"
            >
              {dark ? (
                <>
                  <Sun className="h-4 w-4 text-primary" />
                  Switch to light mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-foreground/70" />
                  Switch to dark mode
                </>
              )}
            </button>
            <div className="h-px bg-border/60" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

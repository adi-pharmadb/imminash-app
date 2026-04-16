"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Theme toggle. Renders inline (for navbars) or fixed bottom-right (legacy).
 * Persists preference to localStorage.
 */
export function ThemeToggle({ inline }: { inline?: boolean } = {}) {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("imminash_theme");
    if (stored === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
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

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className={
        inline
          ? "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-card/80 text-foreground/80 transition-colors hover:border-primary/30 hover:text-foreground"
          : "fixed bottom-5 right-5 z-[90] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-card/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110 hover:border-primary/30"
      }
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle"
    >
      {dark ? (
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-foreground/70" />
      )}
    </button>
  );
}

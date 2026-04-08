"use client";

/**
 * Fact-Check Declaration: dynamic checkbox per employer.
 * Approve button is disabled until all declarations are checked.
 * Persists declaration_confirmed_at and declaration_text to DB.
 */

import { useState, useMemo } from "react";
import { Check, ShieldCheck } from "lucide-react";

interface FactCheckDeclarationProps {
  employerNames: string[];
  onAllConfirmed: () => void;
  disabled?: boolean;
}

export function FactCheckDeclaration({
  employerNames,
  onAllConfirmed,
  disabled = false,
}: FactCheckDeclarationProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const allChecked = useMemo(
    () => employerNames.length > 0 && employerNames.every((name) => checked.has(name)),
    [employerNames, checked],
  );

  const toggleCheck = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (employerNames.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="fact-check-declaration">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Fact-Check Declaration
      </div>

      <div className="space-y-2">
        {employerNames.map((name) => (
          <label
            key={name}
            className="flex items-start gap-2.5 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={checked.has(name)}
              onChange={() => toggleCheck(name)}
              className="mt-0.5 h-4 w-4 rounded border-border/50 text-primary accent-primary"
              data-testid={`declaration-${name.toLowerCase().replace(/\s+/g, "-")}`}
            />
            <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
              I confirm the duties described for <span className="font-medium text-foreground">{name}</span> are
              accurate and reflect my actual work experience.
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={onAllConfirmed}
        disabled={!allChecked || disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: allChecked ? "oklch(0.72 0.17 155)" : "oklch(0.50 0.02 260 / 0.3)",
          color: allChecked ? "oklch(0.13 0.01 260)" : "oklch(0.50 0.02 260)",
        }}
        data-testid="approve-all-btn"
      >
        <Check className="h-4 w-4" />
        Approve Document
      </button>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface PillOption {
  value: string;
  label: string;
}

interface PillSelectProps {
  options: PillOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Reusable pill-style selector for binary/ternary choices.
 * Used for Yes/No, Australia/Overseas, skilled role status, etc.
 */
export function PillSelect({ options, value, onChange, className }: PillSelectProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer",
              selected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

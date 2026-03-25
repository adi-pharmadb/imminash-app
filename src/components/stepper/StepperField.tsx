import type { ReactNode } from "react";

interface StepperFieldProps {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

/**
 * Consistent field wrapper for the stepper pages.
 * Renders a label, optional hint, and child input/select
 * using the Midnight Luxe glass-card treatment.
 */
export function StepperField({ label, hint, optional, children }: StepperFieldProps) {
  return (
    <div className="glass-card rounded-2xl p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_oklch(0.78_0.12_70/0.06)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <label className="block text-sm font-semibold leading-tight tracking-wide text-foreground">
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-normal tracking-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </label>
      </div>
      {hint && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

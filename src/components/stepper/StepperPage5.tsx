"use client";

import type { StepperFormData } from "@/types/assessment";
import { StepperField } from "./StepperField";

interface StepperPage5Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const MIN_CHARS = 50;

/**
 * Page 5: Role details (conditional, mandatory).
 * Only shown if user is/was working skilled.
 * Free-text textarea for job duties with 50-character minimum.
 */
export function StepperPage5({ data, onChange }: StepperPage5Props) {
  const currentLength = data.jobDuties?.trim().length ?? 0;
  const meetsMinimum = currentLength >= MIN_CHARS;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Your role
        </span>
        <p className="text-sm text-muted-foreground">Almost there - tell us what you actually do</p>
      </div>

      <StepperField
        label="Roles & responsibilities"
        hint="Describe your daily tasks and responsibilities in detail. The more specific you are, the more accurate your occupation matches will be. Minimum 50 characters."
      >
        <textarea
          data-testid="field-jobDuties"
          value={data.jobDuties ?? ""}
          onChange={(e) => onChange("jobDuties", e.target.value)}
          placeholder="e.g., I design and develop web applications using React and Node.js, conduct code reviews, write technical documentation, manage deployments to AWS, and mentor junior developers on best practices..."
          className="min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors outline-none"
        />
        <p
          className="mt-1.5 text-xs"
          style={{ color: meetsMinimum ? "oklch(0.55 0.02 260)" : "oklch(0.65 0.2 25)" }}
          data-testid="char-counter"
        >
          {currentLength}/{MIN_CHARS} minimum
        </p>
      </StepperField>
    </div>
  );
}

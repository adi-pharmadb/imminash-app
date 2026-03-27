"use client";

import type { StepperFormData } from "@/types/assessment";
import { StepperField } from "./StepperField";

interface StepperPage5Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const MIN_CHARS = 50;

/**
 * Page 5: Role details.
 * Shown for all users. Copy adapts based on working status:
 * - "Yes"/"Past": describe current/previous duties
 * - "No" (Not yet): describe the kind of work they want to do
 */
export function StepperPage5({ data, onChange }: StepperPage5Props) {
  const currentLength = data.jobDuties?.trim().length ?? 0;
  const meetsMinimum = currentLength >= MIN_CHARS;
  const isNotYet = data.workingSkilled === "No";

  const heading = isNotYet ? "Your ideal role" : "Your role";
  const subheading = isNotYet
    ? "Almost there - tell us what kind of work you want to do"
    : "Almost there - tell us what you actually do";
  const label = isNotYet
    ? "What tasks and responsibilities would your ideal role involve?"
    : "Roles & responsibilities";
  const hint = isNotYet
    ? "Describe the type of work you'd like to do in detail. This helps us match you to the right occupation codes. Minimum 50 characters."
    : "Describe your daily tasks and responsibilities in detail. The more specific you are, the more accurate your occupation matches will be. Minimum 50 characters.";
  const placeholder = isNotYet
    ? "e.g., I want to analyse business requirements, create data models, write reports for stakeholders, and help organisations make data-driven decisions..."
    : "e.g., I design and develop web applications using React and Node.js, conduct code reviews, write technical documentation, manage deployments to AWS, and mentor junior developers on best practices...";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {heading}
        </span>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      <StepperField label={label} hint={hint}>
        <textarea
          data-testid="field-jobDuties"
          value={data.jobDuties ?? ""}
          onChange={(e) => onChange("jobDuties", e.target.value)}
          placeholder={placeholder}
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

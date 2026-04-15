"use client";

/**
 * JourneyStepper — pure projection of the conversation phase into a
 * numbered 6-step journey. No state of its own.
 */

import { Check } from "lucide-react";
import type { ProjectedConversation } from "@/lib/conversation-state";

interface StepDef {
  key: string;
  label: string;
}

const STEPS: StepDef[] = [
  { key: "personal", label: "Personal details" },
  { key: "occupation", label: "Suggested occupation" },
  { key: "cv", label: "CV" },
  { key: "reference", label: "Employer reference" },
  { key: "documents", label: "Document checklist" },
  { key: "submission", label: "Submission guide" },
];

function deriveStepIndex(projection: ProjectedConversation): number {
  const phase = projection.phase;
  const profile = projection.profile ?? {};
  const hasMatches = projection.matches.length > 0;
  const hasCv = !!projection.cvData;

  if (phase === "done") return STEPS.length - 1;
  if (phase === "phase2" || phase === "paid") {
    if (hasCv) return 3;
    return 2;
  }
  if (phase === "awaiting_payment") return 1;

  const hasBasics =
    profile.age !== undefined &&
    profile.visaStatus !== undefined &&
    profile.englishScore !== undefined;
  if (hasBasics && hasMatches) return 1;
  if (hasBasics) return 1;
  return 0;
}

export function JourneyStepper({ projection }: { projection: ProjectedConversation }) {
  const current = deriveStepIndex(projection);

  return (
    <div className="flex h-full flex-col p-6" data-testid="journey-stepper">
      <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        Your journey
      </h2>

      <ol className="space-y-4">
        {STEPS.map((step, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <li
              key={step.key}
              className="flex items-start gap-3"
              data-state={isCurrent ? "current" : isDone ? "done" : "upcoming"}
            >
              <div
                className={[
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                  isDone
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "border-border/60 bg-transparent text-muted-foreground/50",
                ].join(" ")}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={[
                  "pt-0.5 text-sm leading-tight",
                  isCurrent
                    ? "font-medium text-foreground"
                    : isDone
                      ? "text-foreground/70"
                      : "text-muted-foreground/60",
                ].join(" ")}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto pt-6">
        <p className="text-[11px] leading-relaxed text-muted-foreground/50">
          General information only. Not migration advice.
        </p>
      </div>
    </div>
  );
}

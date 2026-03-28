"use client";

/**
 * Re-assessment trigger capture component.
 * Shows "When does your situation next change?" with selectable cards.
 * Captures email + trigger date for future follow-up.
 * CTO Brief v2 section 3.4
 */

import { useState } from "react";
import { GraduationCap, Briefcase, Calendar, Check } from "lucide-react";

interface ReassessmentTriggerProps {
  email: string;
  assessmentId?: string;
}

const TRIGGERS = [
  {
    id: "visa_expiry",
    icon: Calendar,
    title: "Visa expiring",
    description: "My current visa expires soon",
    placeholder: "When does it expire? (e.g. June 2025)",
  },
  {
    id: "studies_completion",
    icon: GraduationCap,
    title: "Finishing studies",
    description: "I am completing a qualification",
    placeholder: "When do you graduate? (e.g. December 2025)",
  },
  {
    id: "promotion",
    icon: Briefcase,
    title: "Career change",
    description: "Expecting a new role or promotion",
    placeholder: "When do you expect this? (e.g. March 2026)",
  },
];

export function ReassessmentTrigger({
  email,
  assessmentId,
}: ReassessmentTriggerProps) {
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selectedTrigger || !dateInput.trim()) return;

    setSubmitting(true);
    try {
      await fetch("/api/reassessment-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          assessmentId,
          triggerType: selectedTrigger,
          triggerDate: dateInput.trim(),
        }),
      });
      setSubmitted(true);
    } catch {
      // Silently fail - this is a non-critical feature
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="glass-card rounded-2xl p-6 text-center space-y-2"
        data-testid="reassessment-trigger"
      >
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "oklch(0.72 0.17 155 / 0.12)" }}
        >
          <Check className="h-5 w-5" style={{ color: "oklch(0.72 0.17 155)" }} />
        </div>
        <p className="text-sm font-medium text-foreground">
          We will remind you to reassess when the time comes.
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-5"
      data-testid="reassessment-trigger"
    >
      <div className="space-y-1">
        <h3 className="font-display text-lg italic text-foreground">
          When does your situation next change?
        </h3>
        <p className="text-sm text-muted-foreground">
          We will remind you to reassess your eligibility at the right time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TRIGGERS.map((trigger) => {
          const Icon = trigger.icon;
          const isSelected = selectedTrigger === trigger.id;

          return (
            <button
              key={trigger.id}
              type="button"
              onClick={() => setSelectedTrigger(trigger.id)}
              className={`rounded-xl p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-primary bg-primary/10"
                  : "bg-secondary/30 hover:bg-secondary/50"
              }`}
            >
              <Icon
                className="h-5 w-5 mb-2"
                style={{
                  color: isSelected
                    ? "oklch(0.62 0.17 250)"
                    : "oklch(0.50 0.02 260)",
                }}
              />
              <p className="text-sm font-semibold text-foreground">
                {trigger.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trigger.description}
              </p>
            </button>
          );
        })}
      </div>

      {selectedTrigger && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            placeholder={
              TRIGGERS.find((t) => t.id === selectedTrigger)?.placeholder || ""
            }
            className="flex-1 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          <button
            onClick={handleSubmit}
            disabled={!dateInput.trim() || submitting}
            className="glow-primary shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? "..." : "Remind me"}
          </button>
        </div>
      )}
    </div>
  );
}

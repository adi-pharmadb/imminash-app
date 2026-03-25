"use client";

import { FileText, Clock, Award, Home } from "lucide-react";
import type { ProcessingTimeInfo } from "@/lib/processing-times";

interface PathwayTimelineProps {
  visa: string;
  processingTime: ProcessingTimeInfo;
  timelineToPR: string;
}

interface TimelineStep {
  icon: typeof FileText;
  label: string;
  duration: string;
}

function getTimelineSteps(visa: string, processingTime: ProcessingTimeInfo): TimelineStep[] {
  switch (visa) {
    case "189":
      return [
        { icon: FileText, label: "Application", duration: "Lodge EOI" },
        { icon: Clock, label: "Processing", duration: processingTime.range },
        { icon: Award, label: "PR Grant", duration: "Immediate PR" },
      ];
    case "190":
      return [
        { icon: FileText, label: "State Nomination", duration: "Apply to state" },
        { icon: Clock, label: "Processing", duration: processingTime.range },
        { icon: Award, label: "PR Grant", duration: "PR on grant" },
        { icon: Home, label: "State Obligation", duration: "2 years in state" },
      ];
    case "491":
      return [
        { icon: FileText, label: "State Nomination", duration: "Apply to state" },
        { icon: Clock, label: "Processing", duration: processingTime.range },
        { icon: Award, label: "Provisional Grant", duration: "5-year visa" },
        { icon: Home, label: "Regional Living", duration: "3 years regional" },
        { icon: Award, label: "191 PR", duration: "Apply for PR" },
      ];
    case "482":
    case "employer":
      return [
        { icon: FileText, label: "Employer Sponsor", duration: "Find sponsor" },
        { icon: Clock, label: "Processing", duration: processingTime.range },
        { icon: Award, label: "482 Grant", duration: "Temporary visa" },
        { icon: Home, label: "Work", duration: "2-3 years same employer" },
        { icon: Award, label: "186 PR", duration: "Transition to PR" },
      ];
    default:
      return [
        { icon: FileText, label: "Application", duration: "Lodge application" },
        { icon: Clock, label: "Processing", duration: processingTime.range },
        { icon: Award, label: "Grant", duration: "Visa granted" },
      ];
  }
}

/**
 * Visual timeline showing the progression from application to PR for a specific visa.
 */
export function PathwayTimeline({ visa, processingTime, timelineToPR }: PathwayTimelineProps) {
  const steps = getTimelineSteps(visa, processingTime);

  return (
    <div className="space-y-3" data-testid="pathway-timeline">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Timeline to PR
      </p>

      {/* Timeline steps */}
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          const isLast = i === steps.length - 1;

          return (
            <div key={i} className="flex items-start shrink-0">
              <div className="flex flex-col items-center text-center" style={{ minWidth: "5rem" }}>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full mb-1.5"
                  style={{
                    background: isLast
                      ? "oklch(0.72 0.17 155 / 0.15)"
                      : "oklch(0.78 0.12 70 / 0.12)",
                  }}
                >
                  <StepIcon
                    className="h-4 w-4"
                    style={{
                      color: isLast
                        ? "oklch(0.72 0.17 155)"
                        : "oklch(0.78 0.12 70)",
                    }}
                  />
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {step.duration}
                </p>
              </div>
              {!isLast && (
                <div
                  className="h-0.5 w-6 mt-4 shrink-0"
                  style={{ background: "oklch(0.30 0.015 260 / 0.5)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* PR timeline description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {timelineToPR}
      </p>
    </div>
  );
}

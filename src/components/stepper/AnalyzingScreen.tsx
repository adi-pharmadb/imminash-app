"use client";

import { useEffect, useRef, useState } from "react";
import type { StepperFormData, MatchResult } from "@/types/assessment";
import { estimatePoints, MAX_POINTS } from "@/lib/points-calculator";
import type { UserProfile } from "@/types/assessment";

/**
 * Generate personalised step messages using form data.
 * Falls back to generic copy when fields are blank.
 */
function getPersonalisedMessages(formData: Partial<StepperFormData>): string[] {
  const jobTitle = formData.jobTitle || "your";
  const field = formData.fieldOfStudy || "your qualifications";

  // Age
  let ageStr = "";
  if (formData.age) {
    ageStr = `age ${formData.age}`;
  }

  // Australian experience years
  const ausExp = formData.australianExperience;
  const expStr = ausExp ? `${ausExp} years Australian experience` : "";

  // Build points detail: "age X, Y years Australian experience"
  const pointsParts = [ageStr, expStr].filter(Boolean);
  const pointsDetail = pointsParts.length > 0 ? ` — ${pointsParts.join(", ")}` : "";

  return [
    `Scanning 574 ANZSCO codes for ${jobTitle} profiles...`,
    `Matching your ${field} to occupation requirements...`,
    `Calculating points${pointsDetail}...`,
    `Cross-referencing ${jobTitle} with ANZSCO task descriptors...`,
    "Checking invitation round history for your top matches...",
    "Evaluating state nomination pathways...",
    "Estimating points gap for 189, 190, and 491 visas...",
    `Comparing your ${field} qualification against ICT and non-ICT pathways...`,
    "Mapping state nomination eligibility across 8 territories...",
    "Almost there \u2014 finalising your personalised report...",
  ];
}

const MESSAGE_COUNT = 10;
const STEP_DURATION_MS = 900;
const TOTAL_ANIMATION_MS = MESSAGE_COUNT * STEP_DURATION_MS; // 9000ms

export interface AnalyzingScreenResult {
  points: number;
  matchedOccupations: MatchResult[];
}

interface AnalyzingScreenProps {
  formData: Partial<StepperFormData>;
  onComplete: (result: AnalyzingScreenResult) => void;
}

/**
 * Animated analyzing screen shown after stepper completion.
 * Coordinates a minimum 4.8s animation with the AI matching API call,
 * advancing only when BOTH the animation and API response are ready.
 */
export function AnalyzingScreen({ formData, onComplete }: AnalyzingScreenProps) {
  const [step, setStep] = useState(0);
  const resultsReady = useRef(false);
  const analyzingDone = useRef(false);
  const apiResult = useRef<AnalyzingScreenResult | null>(null);
  const hasAdvanced = useRef(false);

  const stepMessages = getPersonalisedMessages(formData);
  const progress = ((step + 1) / stepMessages.length) * 100;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (progress / 100) * circumference;

  function tryAdvance() {
    if (resultsReady.current && analyzingDone.current && !hasAdvanced.current && apiResult.current) {
      hasAdvanced.current = true;
      onComplete(apiResult.current);
    }
  }

  // Fire the AI matching API call on mount
  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch("/api/match-occupations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldOfStudy: formData.fieldOfStudy ?? "",
            jobTitle: formData.jobTitle ?? "",
            jobDuties: formData.jobDuties ?? "",
            additionalFieldOfStudy: formData.additionalDegreeField ?? "",
            additionalDegreeLevel: formData.additionalDegree ?? "",
            additionalDegreeCountry: formData.additionalDegreeCountry ?? "",
            skillsOccupations: [],
            employerOccupations: [],
          }),
        });

        const data = await response.json();

        // Transform API response to MatchResult[] (enriched with DB metadata)
        const skillsMatches: MatchResult[] = (data.skillsMatches ?? [])
          .slice(0, 3)
          .map((m: any) => ({
            title: m.title,
            anzsco_code: m.anzsco_code ?? "",
            confidence: m.confidence ?? 0,
            reasoning: m.reasoning ?? "",
            experience_aligned: m.experience_aligned ?? true,
            warnings: m.warnings ?? [],
            score: m.score ?? 0,
            assessing_authority: m.assessing_authority ?? null,
            list: m.list ?? null,
            min_189_points: m.min_189_points ?? null,
            latest_invitation: m.latest_invitation ?? null,
          }));

        // Calculate points
        const points = estimatePoints(formData as UserProfile).total;

        apiResult.current = {
          points,
          matchedOccupations: skillsMatches,
        };
      } catch {
        // On failure, still provide results with calculated points and empty matches
        const points = estimatePoints(formData as UserProfile).total;
        apiResult.current = {
          points,
          matchedOccupations: [],
        };
      }

      resultsReady.current = true;
      tryAdvance();
    }

    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step through messages sequentially, then mark analyzing done
  useEffect(() => {
    const count = stepMessages.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < count; i++) {
      timers.push(setTimeout(() => setStep(i), STEP_DURATION_MS * i));
    }
    timers.push(
      setTimeout(() => {
        analyzingDone.current = true;
        tryAdvance();
      }, STEP_DURATION_MS * count),
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 gradient-mesh">
      <div className="w-full max-w-md space-y-10 text-center">
        {/* Cinematic progress ring */}
        <div className="relative mx-auto h-28 w-28 animate-reveal-up">
          {/* Outer ambient glow */}
          <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
          <svg className="relative h-full w-full -rotate-90" viewBox="0 0 120 120">
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--bar-track)"
              strokeWidth="4"
            />
            {/* Amber progress arc */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="oklch(0.62 0.17 250)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
              style={{
                filter: "drop-shadow(0 0 8px oklch(0.62 0.17 250 / 0.4))",
              }}
            />
          </svg>
          {/* Center dots */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </div>
          </div>
        </div>

        {/* Editorial heading */}
        <div className="animate-reveal-up delay-100">
          <h2 className="font-display text-3xl italic text-foreground">
            Analysing your profile{formData.firstName ? `, ${formData.firstName}` : ""}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hang tight. We are running your profile against current occupation lists and invitation data.
          </p>
        </div>

        {/* Step messages - editorial style */}
        <div className="space-y-4 text-left animate-reveal-up delay-200" data-testid="step-messages">
          {stepMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 transition-all duration-500 ${
                i <= step ? "opacity-100 translate-x-0" : "opacity-15 translate-x-2"
              }`}
              data-testid={`step-${i}`}
              data-active={i <= step}
            >
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                {i < step ? (
                  <div className="h-2 w-2 rounded-full bg-primary" style={{ boxShadow: "0 0 8px oklch(0.62 0.17 250 / 0.5)" }} />
                ) : i === step ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse-glow" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <span className={`text-sm transition-colors duration-500 ${
                i <= step ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {msg}
              </span>
            </div>
          ))}
        </div>

        {/* Shimmer skeleton preview */}
        <div className="space-y-3 pt-2 animate-reveal-up delay-300">
          <div className="h-14 rounded-2xl shimmer" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded-2xl shimmer" />
            <div className="h-20 rounded-2xl shimmer" style={{ animationDelay: "0.2s" }} />
            <div className="h-20 rounded-2xl shimmer" style={{ animationDelay: "0.4s" }} />
          </div>
          <div className="h-24 rounded-2xl shimmer" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}

export { TOTAL_ANIMATION_MS, STEP_DURATION_MS };

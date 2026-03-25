"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepperFlow } from "@/components/stepper/StepperFlow";
import { AnalyzingScreen } from "@/components/stepper/AnalyzingScreen";
import { TeaserScreen } from "@/components/stepper/TeaserScreen";
import { EmailGate } from "@/components/stepper/EmailGate";
import { estimatePoints } from "@/lib/points-calculator";
import type { StepperFormData, UserProfile } from "@/types/assessment";
import type { AnalyzingScreenResult } from "@/components/stepper/AnalyzingScreen";

type Phase = "stepper" | "analyzing" | "teaser" | "emailGate";

export default function AssessmentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("stepper");
  const [formData, setFormData] = useState<Partial<StepperFormData>>({});
  const [result, setResult] = useState<AnalyzingScreenResult | null>(null);

  function handleStepperComplete(data: Partial<StepperFormData>) {
    try {
      sessionStorage.setItem("imminash_completed", JSON.stringify(data));
    } catch {
      // Silently fail
    }
    setFormData(data);
    setPhase("analyzing");
  }

  function handleAnalyzingComplete(analyzingResult: AnalyzingScreenResult) {
    setResult(analyzingResult);
    setPhase("teaser");
  }

  function handleUnlock() {
    setPhase("emailGate");
  }

  async function handleEmailSubmit(email: string) {
    const breakdown = estimatePoints(formData as UserProfile);

    // Build skills and employer matches from result
    const skillsMatches = result?.matchedOccupations ?? [];
    const employerMatches: typeof skillsMatches = [];

    // POST to /api/leads — retry once on failure
    let leadId: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const leadRes = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            first_name: formData.firstName ?? null,
            visa_status: formData.visaStatus ?? null,
            job_title: formData.jobTitle ?? null,
          }),
        });
        if (leadRes.ok) {
          const leadData = await leadRes.json();
          leadId = leadData.lead_id;
          break;
        }
      } catch {
        // Retry on next iteration
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
    if (!leadId) {
      console.error("Failed to create lead for", email);
    }

    // POST to /api/assessments — retry once on failure
    let assessmentId: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const assessRes = await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_data: formData,
            points_breakdown: breakdown,
            total_points: breakdown.total,
            matched_occupations: {
              skillsMatches,
              employerMatches,
            },
            lead_id: leadId,
          }),
        });
        if (assessRes.ok) {
          const assessData = await assessRes.json();
          assessmentId = assessData.assessment_id;
          break;
        }
      } catch {
        // Retry on next iteration
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
    if (!assessmentId) {
      console.error("Failed to create assessment for", email);
    }

    // Store results data for the results page
    try {
      sessionStorage.setItem(
        "imminash_results",
        JSON.stringify({
          formData,
          skillsMatches,
          employerMatches,
          breakdown,
          assessmentId,
        }),
      );
    } catch {
      // Silently fail
    }

    router.push("/results");
  }

  if (phase === "analyzing") {
    return (
      <AnalyzingScreen
        formData={formData}
        onComplete={handleAnalyzingComplete}
      />
    );
  }

  if (phase === "teaser" && result) {
    return (
      <TeaserScreen
        points={result.points}
        matchedOccupations={result.matchedOccupations}
        firstName={formData.firstName}
        onUnlock={handleUnlock}
      />
    );
  }

  if (phase === "emailGate") {
    return <EmailGate onSubmit={handleEmailSubmit} />;
  }

  return <StepperFlow onComplete={handleStepperComplete} />;
}

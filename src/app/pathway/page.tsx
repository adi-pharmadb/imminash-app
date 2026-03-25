"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Search } from "lucide-react";
import type { MatchResult, PointsBreakdown, StepperFormData, UserProfile } from "@/types/assessment";
import type { StateNomination } from "@/types/database";
import { analyzePathways, detectEdgeCases, type PathwayAnalysis } from "@/lib/visa-pathway-engine";
import { isACSBody } from "@/lib/workspace-helpers";
import { PathwayCard } from "@/components/pathway/PathwayCard";
import { RecommendedBanner } from "@/components/pathway/RecommendedBanner";
import { PointsGapAnalysis } from "@/components/pathway/PointsGapAnalysis";
import { StateAvailabilityTable } from "@/components/pathway/StateAvailabilityTable";
import { EdgeCaseWarning } from "@/components/pathway/EdgeCaseWarning";
import { LAST_UPDATED } from "@/lib/processing-times";

/**
 * Data shape stored in sessionStorage for the results page.
 */
interface ResultsData {
  formData: Partial<StepperFormData>;
  skillsMatches: MatchResult[];
  employerMatches: MatchResult[];
  breakdown: PointsBreakdown;
  assessmentId?: string;
}

/**
 * Build a UserProfile from partial form data with safe defaults.
 */
function buildProfileFromForm(formData: Partial<StepperFormData>): UserProfile {
  return {
    firstName: formData.firstName ?? "",
    age: formData.age ?? 25,
    visaStatus: formData.visaStatus ?? "",
    visaExpiry: formData.visaExpiry ?? "",
    educationLevel: formData.educationLevel ?? "",
    fieldOfStudy: formData.fieldOfStudy ?? "",
    universityName: formData.universityName ?? "",
    countryOfEducation: formData.countryOfEducation ?? "",
    australianStudy: formData.australianStudy ?? "",
    regionalStudy: formData.regionalStudy ?? "",
    additionalDegree: formData.additionalDegree ?? "",
    additionalDegreeField: formData.additionalDegreeField ?? "",
    additionalDegreeCountry: formData.additionalDegreeCountry ?? "",
    workingSkilled: formData.workingSkilled ?? "",
    jobTitle: formData.jobTitle ?? "",
    australianExperience: formData.australianExperience ?? "",
    experience: formData.experience ?? "",
    jobDuties: formData.jobDuties ?? "",
    englishScore: formData.englishScore ?? "",
    naatiCcl: formData.naatiCcl ?? "",
    professionalYear: formData.professionalYear ?? "",
    relationshipStatus: formData.relationshipStatus ?? "",
    partnerSkills: formData.partnerSkills ?? "",
    partnerStatus: formData.partnerStatus ?? "",
  };
}

/**
 * Loading skeleton shown while fetching state nominations and computing analysis.
 * Uses glass-card divs with pulse animation to match the design system.
 */
function PathwayLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background gradient-mesh" data-testid="pathway-loading">
      {/* Brand header skeleton */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <div className="h-7 w-28 rounded-lg shimmer" />
        <div className="h-5 w-32 rounded shimmer" />
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-6">
        {/* Heading skeleton */}
        <div className="space-y-3 animate-reveal-up">
          <div className="h-9 w-80 max-w-full rounded-lg shimmer" />
          <div className="h-4 w-full max-w-md rounded shimmer" />
        </div>

        {/* Recommended banner skeleton */}
        <div className="animate-reveal-up delay-100">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-32 rounded shimmer" />
                <div className="h-6 w-48 rounded shimmer" />
              </div>
            </div>
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-11 w-40 rounded-xl shimmer" />
          </div>
        </div>

        {/* Pathway card skeletons */}
        {[200, 300, 400].map((delay) => (
          <div key={delay} className={`animate-reveal-up delay-${delay}`}>
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-56 rounded shimmer" />
                  <div className="h-4 w-full max-w-sm rounded shimmer" />
                </div>
                <div className="h-7 w-24 rounded-full shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-40 rounded shimmer" />
                <div className="h-2 w-full rounded-full shimmer" />
              </div>
              <div className="h-16 w-full rounded-xl shimmer" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-4 w-full max-w-xs rounded shimmer" />
                <div className="h-4 w-full max-w-[280px] rounded shimmer" />
              </div>
            </div>
          </div>
        ))}

        {/* Status text */}
        <div className="animate-reveal-up delay-500">
          <p className="text-center text-sm text-muted-foreground">
            Analyzing your visa pathways...
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state shown when API calls fail.
 * Pathway analysis still renders without state-specific data.
 */
function StateDataErrorNote() {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-2.5 animate-reveal-up delay-100"
      style={{
        background: "oklch(0.78 0.12 70 / 0.06)",
        border: "1px solid oklch(0.78 0.12 70 / 0.2)",
      }}
      data-testid="state-data-error"
    >
      <AlertCircle
        className="h-4 w-4 shrink-0 mt-0.5"
        style={{ color: "oklch(0.78 0.12 70)" }}
      />
      <p className="text-sm text-muted-foreground leading-relaxed">
        State nomination data could not be loaded. Pathway analysis below is based on
        points and occupation list status only. State-specific 190/491 availability may
        differ from what is shown.
      </p>
    </div>
  );
}

/**
 * Empty state shown when no viable pathways exist for the user.
 * Strong consultation CTA with messaging.
 */
function EmptyPathwayState() {
  return (
    <div
      className="glass-card rounded-2xl p-8 text-center space-y-5 animate-reveal-up delay-200"
      data-testid="empty-pathway-state"
    >
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "oklch(0.78 0.12 70 / 0.1)" }}
      >
        <Search className="h-7 w-7" style={{ color: "oklch(0.78 0.12 70)" }} />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl italic text-foreground">
          No Clear Visa Pathway Identified
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
          Based on your current profile, we could not identify a strong points-tested
          visa pathway. This does not mean your options are exhausted. A registered
          migration agent can assess your full circumstances and identify alternative
          routes, including employer-sponsored options, that may be available to you.
        </p>
      </div>
      <a
        href="https://calendly.com/studynash"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] glow-amber"
        style={{
          background: "oklch(0.78 0.12 70)",
          color: "oklch(0.13 0.01 260)",
        }}
        data-testid="empty-state-consultation-cta"
      >
        Book a Free Consultation
      </a>
    </div>
  );
}

/**
 * Visa Pathway page (Tool 2).
 * Loads assessment data from sessionStorage, fetches state nominations,
 * runs the pathway decision engine, and renders personalised recommendations.
 */
export default function PathwayPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [analyses, setAnalyses] = useState<PathwayAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [stateDataError, setStateDataError] = useState(false);

  // Load session data and fetch state nominations
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("imminash_results");
      if (!raw) {
        setRedirecting(true);
        router.push("/assessment");
        return;
      }

      const parsed: ResultsData = JSON.parse(raw);
      setData(parsed);

      const profile = buildProfileFromForm(parsed.formData);

      // Fetch state nominations
      const anzscoCodesList = parsed.skillsMatches.map((m) => m.anzsco_code).join(",");
      fetch(`/api/state-nominations?anzsco_codes=${anzscoCodesList}`)
        .then((res) => res.json())
        .then((apiData) => {
          const nominations: StateNomination[] = [];
          if (apiData?.nominations) {
            for (const code of Object.keys(apiData.nominations)) {
              nominations.push(...apiData.nominations[code]);
            }
          }

          const results = analyzePathways(
            profile,
            parsed.skillsMatches,
            parsed.breakdown,
            nominations,
          );
          setAnalyses(results);
          setLoading(false);
        })
        .catch(() => {
          // Fallback: run analysis without state nomination data
          setStateDataError(true);
          const results = analyzePathways(
            profile,
            parsed.skillsMatches,
            parsed.breakdown,
            [],
          );
          setAnalyses(results);
          setLoading(false);
        });
    } catch {
      setRedirecting(true);
      router.push("/assessment");
    }
  }, [router]);

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to assessment...</p>
      </div>
    );
  }

  if (loading || !data) {
    return <PathwayLoadingSkeleton />;
  }

  const { formData, breakdown } = data;
  const primaryAnalysis = analyses[0] ?? null;
  const warnings = primaryAnalysis?.warnings ?? [];
  const recommended = primaryAnalysis?.recommended ?? null;

  // Find the recommended pathway result
  const recommendedPathway = primaryAnalysis?.pathways.find(
    (p) => p.visa === recommended?.visa,
  );

  // Determine primary assessing body
  const primaryAssessingBody = data.skillsMatches[0]?.assessing_authority ?? null;
  const isACS = primaryAssessingBody ? isACSBody(primaryAssessingBody) : false;

  // Find the first pathway with a gap analysis
  const gapPathway = primaryAnalysis?.pathways.find(
    (p) => p.gapAnalysis && p.gapAnalysis.gap > 0,
  );

  // Primary occupation state eligibility (from 190 or 491 pathway)
  const statePathway = primaryAnalysis?.pathways.find(
    (p) => p.stateEligibility.length > 0,
  );

  // Check if there are any viable pathways (not "Not Available")
  const hasViablePathways = analyses.some((a) =>
    a.pathways.some((p) => p.rating !== "Not Available"),
  );

  return (
    <div className="min-h-screen bg-background pb-28 gradient-mesh" data-testid="pathway-page">
      {/* Brand header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <span
          className="font-display text-2xl italic tracking-tight"
          style={{ color: "oklch(0.78 0.12 70)" }}
        >
          imminash
        </span>
        <button
          onClick={() => router.push("/results")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </button>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-6">
        {/* Heading */}
        <div className="space-y-3 animate-reveal-up">
          <h1 className="font-display text-3xl font-normal italic text-foreground sm:text-4xl">
            {formData.firstName
              ? `${formData.firstName}'s Visa Pathway Roadmap`
              : "Your Visa Pathway Roadmap"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Personalised visa pathway recommendations based on your points score,
            occupation lists, and state nomination data. Processing times last
            updated {LAST_UPDATED}.
          </p>
        </div>

        {/* State data error note */}
        {stateDataError && <StateDataErrorNote />}

        {/* Edge Case Warnings */}
        {warnings.length > 0 && (
          <div className="animate-reveal-up delay-100">
            <EdgeCaseWarning warnings={warnings} />
          </div>
        )}

        {/* Empty state: no viable pathways */}
        {!hasViablePathways && analyses.length > 0 ? (
          <EmptyPathwayState />
        ) : (
          <>
            {/* Recommended Banner */}
            {recommended && recommendedPathway && (
              <div className="animate-reveal-up delay-200">
                <RecommendedBanner
                  pathway={recommendedPathway}
                  reasoning={recommended.reasoning}
                />
              </div>
            )}

            {/* Pathway Cards */}
            {analyses.map((analysis, aIdx) => (
              <div key={analysis.occupation.anzsco_code} className="space-y-5">
                {analyses.length > 1 && (
                  <div className={`animate-reveal-up delay-${Math.min((aIdx + 2) * 100, 600)}`}>
                    <h2 className="font-display text-xl italic text-foreground">
                      {analysis.occupation.title}
                      <span className="text-sm text-muted-foreground ml-2 not-italic">
                        ANZSCO {analysis.occupation.anzsco_code}
                      </span>
                    </h2>
                  </div>
                )}
                {analysis.pathways
                  .filter((p) => p.rating !== "Not Available")
                  .map((pathway, pIdx) => (
                    <div
                      key={`${analysis.occupation.anzsco_code}-${pathway.visa}`}
                      className={`animate-reveal-up delay-${Math.min((aIdx * 3 + pIdx + 3) * 100, 600)}`}
                    >
                      <PathwayCard
                        pathway={pathway}
                        userPoints={breakdown.total}
                        breakdown={breakdown}
                      />
                    </div>
                  ))}

                {/* Show "Not Available" pathways in a collapsed section */}
                {analysis.pathways.filter((p) => p.rating === "Not Available").length > 0 && (
                  <div className={`animate-reveal-up delay-${Math.min((aIdx + 5) * 100, 600)}`}>
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Not Available for Your Occupation
                      </p>
                      {analysis.pathways
                        .filter((p) => p.rating === "Not Available")
                        .map((pathway) => (
                          <div
                            key={`${analysis.occupation.anzsco_code}-${pathway.visa}-na`}
                            className="glass-card rounded-xl p-4 flex items-center justify-between"
                            style={{ opacity: 0.6 }}
                            data-testid="pathway-not-available"
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {pathway.visaName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {pathway.reasoning}
                              </p>
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                              style={{
                                background: "oklch(0.40 0.02 260 / 0.12)",
                                color: "oklch(0.40 0.02 260)",
                              }}
                            >
                              Not Available
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Points Gap Analysis */}
            {gapPathway?.gapAnalysis && (
              <div className="animate-reveal-up delay-500">
                <PointsGapAnalysis
                  currentPoints={gapPathway.gapAnalysis.currentPoints}
                  targetPoints={gapPathway.gapAnalysis.targetPoints}
                  suggestions={gapPathway.gapAnalysis.suggestions}
                />
              </div>
            )}

            {/* State Availability Table */}
            {statePathway && statePathway.stateEligibility.length > 0 && (
              <div className="animate-reveal-up delay-600">
                <StateAvailabilityTable
                  eligibility={statePathway.stateEligibility}
                  occupationTitle={primaryAnalysis?.occupation.title ?? "your occupation"}
                />
              </div>
            )}

            {/* Employer Sponsored Section */}
            {primaryAnalysis && (
              <div className="animate-reveal-up delay-600">
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="font-display text-lg italic text-foreground">
                    Employer Sponsored Backup
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {primaryAnalysis.employerPathway.reasoning}
                  </p>
                  {primaryAnalysis.employerPathway.nextSteps.length > 0 && (
                    <ul className="space-y-1.5">
                      {primaryAnalysis.employerPathway.nextSteps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground leading-relaxed"
                        >
                          <span style={{ color: "oklch(0.78 0.12 70)" }}>-</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="animate-reveal-up delay-600">
          <p
            className="mx-auto max-w-lg text-center text-xs leading-relaxed"
            style={{ color: "oklch(0.60 0.02 260 / 0.7)" }}
            data-testid="pathway-disclaimer"
          >
            This tool provides general information only and does not constitute
            migration advice. Always consult a registered migration agent (MARA)
            for personalised advice.
          </p>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50" data-testid="sticky-cta">
        <div
          className="border-t backdrop-blur-xl"
          style={{
            background: "oklch(0.13 0.01 260 / 0.85)",
            borderColor: "oklch(0.30 0.015 260 / 0.5)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-6 py-4">
            {isACS ? (
              <button
                onClick={() => router.push("/workspace")}
                className="w-full max-w-md rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] glow-amber"
                data-testid="cta-skill-assessment"
              >
                Start Your Skill Assessment
              </button>
            ) : (
              <a
                href="https://calendly.com/studynash"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-md rounded-xl py-4 text-center font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] glow-amber"
                style={{
                  background: "oklch(0.78 0.12 70)",
                  color: "oklch(0.13 0.01 260)",
                }}
                data-testid="cta-consultation"
              >
                Book a Free Consultation
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

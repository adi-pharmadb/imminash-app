"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MatchResult, PointsBreakdown, StepperFormData } from "@/types/assessment";
import type { StateEligibility } from "@/lib/state-nominations";
import {
  getStateEligibility,
  getStateInvitingSummary,
  getBestStateRecommendation,
} from "@/lib/state-nominations";
import { getPossibilityRating, getPathwaySignal } from "@/lib/pathway-signals";
import { analyzePointsGap } from "@/lib/points-gap";
import { OccupationCard } from "@/components/results/OccupationCard";
import { PointsBreakdownCard } from "@/components/results/PointsBreakdownCard";
import { PointsGapAnalysis } from "@/components/pathway/PointsGapAnalysis";
import { SummaryCard } from "@/components/results/SummaryCard";
import { DualCTA } from "@/components/results/DualCTA";
import { ReassessmentTrigger } from "@/components/results/ReassessmentTrigger";
import { AuthModal } from "@/components/auth/AuthModal";
import { OccupationPicker } from "@/components/results/OccupationPicker";
import { createClient } from "@/lib/supabase/client";
import { isACSBody } from "@/lib/workspace-helpers";
import type { StateNomination } from "@/types/database";

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
 * Results dashboard showing recommended occupations.
 * Employer Sponsored tab removed per CTO Brief v2 section 2.2.
 */
export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [stateData, setStateData] = useState<Map<string, StateEligibility[]>>(
    new Map(),
  );
  const [nominationsLoading, setNominationsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [gateEmail, setGateEmail] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("imminash_results");
      if (raw) {
        setData(JSON.parse(raw));
      }

      // Retrieve the email submitted at the email gate
      const emailRaw = sessionStorage.getItem("imminash_gate_email");
      if (emailRaw) {
        setGateEmail(emailRaw);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch state nominations from API and compute eligibility with real data
  useEffect(() => {
    if (!data) return;

    const anzsco_codes = data.skillsMatches.map((occ) => occ.anzsco_code);
    if (anzsco_codes.length === 0) return;

    setNominationsLoading(true);

    fetch(`/api/state-nominations?anzsco_codes=${anzsco_codes.join(",")}`)
      .then((res) => res.json())
      .then((body: { nominations: Record<string, StateNomination[]> }) => {
        const nominations = body.nominations ?? {};
        const map = new Map<string, StateEligibility[]>();

        for (const occ of data.skillsMatches) {
          const list = occ.list ?? "CSOL";
          const occNominations = nominations[occ.anzsco_code] ?? [];
          const eligibility = getStateEligibility(
            occ.anzsco_code,
            occ.title,
            list,
            occNominations,
          );
          map.set(occ.anzsco_code, eligibility);
        }

        setStateData(map);
      })
      .catch(() => {
        // On API failure, fall back to derived-only eligibility (no DB nominations)
        const map = new Map<string, StateEligibility[]>();
        for (const occ of data.skillsMatches) {
          const list = occ.list ?? "CSOL";
          const eligibility = getStateEligibility(
            occ.anzsco_code,
            occ.title,
            list,
            [],
          );
          map.set(occ.anzsco_code, eligibility);
        }
        setStateData(map);
      })
      .finally(() => {
        setNominationsLoading(false);
      });
  }, [data]);

  /**
   * Handle "Prepare my skill assessment documents" click.
   * Shows picker with ALL occupations (non-ACS greyed out).
   * If only one ACS match, proceeds directly.
   */
  const handleStartDocPrep = useCallback(() => {
    if (!data) return;

    const acsMatches = data.skillsMatches.filter(
      (occ) => occ.assessing_authority && isACSBody(occ.assessing_authority),
    );

    if (acsMatches.length > 1 || data.skillsMatches.length > 1) {
      // Multiple occupations: show picker with all (non-ACS greyed out)
      setPickerOpen(true);
    } else if (acsMatches.length === 1) {
      // Single ACS occupation: select it automatically and proceed
      handleOccupationSelected(acsMatches[0]);
    }
  }, [data]);

  /**
   * After occupation is selected, store it and proceed to auth or workspace.
   */
  const handleOccupationSelected = useCallback(async (occupation: MatchResult) => {
    // Store the selected occupation for the workspace to read
    try {
      sessionStorage.setItem("imminash_selected_occupation", occupation.anzsco_code);
    } catch { /* ignore */ }

    setPickerOpen(false);

    // Check if already authenticated
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        router.push("/value");
        return;
      }
    } catch {
      // Fall through to auth modal
    }

    setAuthModalOpen(true);
  }, [router]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  const { formData, skillsMatches, breakdown } = data;

  // Check if any matched occupation has an ACS assessing body
  const hasACSMatch = skillsMatches.some(
    (occ) => occ.assessing_authority && isACSBody(occ.assessing_authority),
  );

  // Compute top match possibility for dual CTA secondary copy
  const topList = skillsMatches[0]?.list ?? "CSOL";
  const topPossibility = getPossibilityRating(
    breakdown.total,
    skillsMatches[0]?.min_189_points ?? null,
    topList === "MLTSSL",
  );

  // Compute total unique inviting states for summary card
  const allInvitingStates = new Set<string>();
  stateData.forEach((eligibility) => {
    eligibility.forEach((e) => {
      if (e.visa_190 === true || e.visa_491 === true) {
        allInvitingStates.add(e.state);
      }
    });
  });

  // Points gap analysis for the top match
  const topTarget = skillsMatches[0]?.min_189_points ?? 65;
  const gapAnalysis = analyzePointsGap(
    breakdown,
    topTarget,
    skillsMatches[0]?.assessing_authority,
  );

  return (
    <div className="min-h-screen bg-background pb-20 gradient-mesh">
      {/* Brand header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <span
          className="font-display text-2xl italic tracking-tight"
          style={{ color: "oklch(0.62 0.17 250)" }}
        >
          imminash
        </span>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-6">
        {/* Heading */}
        <div className="space-y-3 animate-reveal-up">
          <h1 className="font-display text-3xl font-normal italic text-foreground sm:text-4xl">
            {formData.firstName
              ? `${formData.firstName}'s PR Eligibility Report`
              : "Your PR Eligibility Report"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Based on official ANZSCO occupation lists, invitation rounds, and
            DHA points tables.
          </p>
        </div>

        {/* Summary card with anchor navigation */}
        <div className="animate-reveal-up delay-100">
          <SummaryCard
            firstName={formData.firstName || ""}
            breakdown={breakdown}
            skillsMatches={skillsMatches}
            stateCount={allInvitingStates.size}
          />
        </div>

        {/* Social proof position 1: below summary card */}
        <p className="text-xs text-muted-foreground text-center animate-reveal-up delay-100">
          Based on official ANZSCO occupation lists, invitation rounds, and DHA points tables.
        </p>

        {/* Points breakdown */}
        <div id="points-breakdown" className="animate-reveal-up delay-100">
          <PointsBreakdownCard
            breakdown={breakdown}
            minRequired={skillsMatches[0]?.min_189_points ?? null}
          />
        </div>

        {/* How to improve your score */}
        {gapAnalysis.gap > 0 && gapAnalysis.suggestions.length > 0 && (
          <div className="animate-reveal-up delay-100">
            <div className="space-y-2 mb-4">
              <h2 className="font-display text-xl italic text-foreground">
                How to improve your score
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You need {gapAnalysis.gap} more points to reach the minimum for your top match.
              </p>
            </div>
            <PointsGapAnalysis
              currentPoints={gapAnalysis.currentPoints}
              targetPoints={gapAnalysis.targetPoints}
              suggestions={gapAnalysis.suggestions.filter((s) => s.available)}
            />
          </div>
        )}

        {/* Social proof position 2: above occupation cards */}
        <p className="text-xs text-muted-foreground text-center animate-reveal-up delay-200">
          Covering 574 ANZSCO codes across all 8 Australian states and territories.
        </p>

        {/* Recommended Occupations */}
        <div className="animate-reveal-up delay-200">
          <div className="space-y-2 mb-5">
            <h2 className="font-display text-xl italic text-foreground">
              Recommended Occupations
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your top occupation matches based on your qualifications, experience, and job duties.
            </p>
          </div>

          <div className="space-y-5" data-testid="skills-tab-content">
            {skillsMatches.map((occ, i) => {
              const list = occ.list ?? "CSOL";
              const isMltssl = list === "MLTSSL";
              const possibility = getPossibilityRating(
                breakdown.total,
                occ.min_189_points,
                isMltssl,
              );
              const eligibility = stateData.get(occ.anzsco_code) ?? [];
              const nomCount190 = eligibility.filter(
                (e) => e.visa_190 === true,
              ).length;
              const nomCount491 = eligibility.filter(
                (e) => e.visa_491 === true,
              ).length;
              const stateNomCount = Math.max(nomCount190, nomCount491);
              const stateSummary = getStateInvitingSummary(eligibility);
              const bestState = getBestStateRecommendation(eligibility);

              // Build an Occupation-like object for getPathwaySignal
              const occForSignals = {
                id: "",
                anzsco_code: occ.anzsco_code,
                title: occ.title,
                skill_level: null,
                assessing_authority: occ.assessing_authority,
                mltssl: list === "MLTSSL",
                stsol: list === "STSOL",
                csol: list === "CSOL",
                rol: list === "ROL",
                min_189_points: occ.min_189_points,
                qualification_level_required: null,
                unit_group_description: null,
                industry_keywords: null,
              };
              const signals = getPathwaySignal(occForSignals);

              return (
                <div
                  key={occ.anzsco_code}
                  className={`animate-reveal-up delay-${Math.min((i + 1) * 100, 600)}`}
                >
                  <OccupationCard
                    occupation={occ}
                    rank={i}
                    userPoints={breakdown.total}
                    listStatus={list}
                    possibility={possibility}
                    stateNomCount={stateNomCount}
                    stateEligibility={eligibility}
                    pathwaySignals={signals}
                    stateInvitingSummary={stateSummary}
                    bestStateRecommendation={bestState ?? undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Dual CTA - appears after scrolling past occupation cards */}
        <div className="animate-reveal-up delay-300">
          <DualCTA
            possibility={topPossibility}
            hasACSMatch={hasACSMatch}
            onStartDocPrep={handleStartDocPrep}
          />
        </div>

        {/* Re-assessment trigger */}
        <div className="animate-reveal-up delay-300">
          <ReassessmentTrigger
            email={gateEmail}
            assessmentId={data.assessmentId}
          />
        </div>

        {/* Social proof position 3: near conversion CTAs */}
        <div className="animate-reveal-up delay-300 text-center">
          <p className="text-xs text-muted-foreground">
            Applicants who use imminash to prepare their documents report higher confidence in their submissions.
          </p>
        </div>

        {/* Pathway CTA */}
        <div className="animate-reveal-up delay-300" data-testid="pathway-cta">
          <Link
            href="/pathway"
            className="glass-card glow-primary group flex w-full items-center justify-between rounded-2xl px-6 py-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              borderColor: "oklch(0.62 0.17 250 / 0.4)",
            }}
          >
            <div className="space-y-1">
              <p
                className="font-display text-lg font-semibold italic"
                style={{ color: "oklch(0.62 0.17 250)" }}
              >
                Which visa should you go for?
              </p>
              <p className="text-sm text-muted-foreground">
                See how 189, 190, and 491 stack up for your profile, including
                state nominations and points gaps.
              </p>
            </div>
            <ArrowRight
              className="ml-4 h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: "oklch(0.62 0.17 250)" }}
            />
          </Link>
        </div>
      </div>

      {/* Occupation Picker Modal - now shows ALL occupations */}
      <OccupationPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        occupations={skillsMatches}
        onSelect={handleOccupationSelected}
      />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultEmail={gateEmail}
      />
    </div>
  );
}

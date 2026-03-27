"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MatchResult, PointsBreakdown, StepperFormData } from "@/types/assessment";
import type { StateEligibility } from "@/lib/state-nominations";
import { getStateEligibility, getStateInvitingSummary } from "@/lib/state-nominations";
import { getPossibilityRating, getPathwaySignal } from "@/lib/pathway-signals";
import { OccupationCard } from "@/components/results/OccupationCard";
import { PointsBreakdownCard } from "@/components/results/PointsBreakdownCard";
import { DualCTA } from "@/components/results/DualCTA";
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
   * If there are multiple occupations, show the picker first.
   * Then authenticate if needed, then go to /workspace.
   */
  const handleStartDocPrep = useCallback(() => {
    if (!data) return;

    const acsMatches = data.skillsMatches.filter(
      (occ) => occ.assessing_authority && isACSBody(occ.assessing_authority),
    );

    if (acsMatches.length > 1) {
      // Multiple ACS occupations: let user choose
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
        router.push("/workspace");
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

        {/* Points breakdown */}
        <div className="animate-reveal-up delay-100">
          <PointsBreakdownCard
            breakdown={breakdown}
            minRequired={skillsMatches[0]?.min_189_points ?? null}
          />
        </div>

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

      {/* Occupation Picker Modal */}
      <OccupationPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        occupations={skillsMatches.filter(
          (occ) => occ.assessing_authority && isACSBody(occ.assessing_authority),
        )}
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

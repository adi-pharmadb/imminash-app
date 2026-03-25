"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import type { MatchResult, PointsBreakdown, StepperFormData } from "@/types/assessment";
import type { StateEligibility } from "@/lib/state-nominations";
import { getStateEligibility, getStateInvitingSummary, STATE_NAMES } from "@/lib/state-nominations";
import { getPossibilityRating, getPrimaryList, getPathwaySignal } from "@/lib/pathway-signals";
import { getEmployerEligibility } from "@/lib/employer-eligibility";
import { estimatePoints, parseExperienceYears } from "@/lib/points-calculator";
import { OccupationCard } from "@/components/results/OccupationCard";
import { EmployerCard } from "@/components/results/EmployerCard";
import { PointsBreakdownCard } from "@/components/results/PointsBreakdownCard";
import { AuthModal } from "@/components/auth/AuthModal";
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
 * Full results dashboard with two-tab layout (Skills Assessment / Employer Sponsored).
 * Wires "Start Document Preparation" to auth modal or direct redirect for return users.
 */
export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [activeTab, setActiveTab] = useState<"skills" | "employer">("skills");
  const [stateData, setStateData] = useState<Map<string, StateEligibility[]>>(
    new Map(),
  );
  const [nominationsLoading, setNominationsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
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
   * Handle "Start Document Preparation" click.
   * If the user is already authenticated, skip the modal and go to /workspace. [AC-AU4]
   * Otherwise, show the auth modal. [AC-AU1]
   */
  const handleStartDocPrep = useCallback(async () => {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      router.push("/workspace");
      return;
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

  const { formData, skillsMatches, employerMatches, breakdown } = data;

  // Determine the primary assessing body from the top match
  const primaryAssessingBody = skillsMatches[0]?.assessing_authority || null;

  return (
    <div className="min-h-screen bg-background pb-28 gradient-mesh">
      {/* Brand header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <span
          className="font-display text-2xl italic tracking-tight"
          style={{ color: "oklch(0.78 0.12 70)" }}
        >
          imminash
        </span>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-6">
        {/* Heading */}
        <div className="space-y-3 animate-reveal-up">
          <h1 className="font-display text-3xl font-normal italic text-foreground sm:text-4xl">
            {formData.firstName
              ? `${formData.firstName}'s Skills Assessment Roadmap`
              : "Your Skills Assessment Roadmap"}
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

        {/* Tabs */}
        <div className="animate-reveal-up delay-200">
          <div
            className="glass-card rounded-xl p-1.5 flex gap-1"
            data-testid="results-tabs"
          >
            <button
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                activeTab === "skills"
                  ? "bg-primary/15 text-primary glow-amber"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              onClick={() => setActiveTab("skills")}
              data-testid="tab-skills"
            >
              Skills Assessment
            </button>
            <button
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                activeTab === "employer"
                  ? "bg-primary/15 text-primary glow-amber"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              onClick={() => setActiveTab("employer")}
              data-testid="tab-employer"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Employer Sponsored
              </span>
            </button>
          </div>

          {/* Skills Assessment Tab */}
          {activeTab === "skills" && (
            <div className="space-y-5 pt-6" data-testid="skills-tab-content">
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
          )}

          {/* Employer Sponsored Tab */}
          {activeTab === "employer" && (
            <div className="space-y-5 pt-6" data-testid="employer-tab-content">
              <div className="space-y-2">
                <h3 className="font-display text-xl italic text-foreground">
                  Your Employer Sponsored Options
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Based on your matched occupations and experience, here are
                  your employer-sponsored visa pathways.
                </p>
              </div>

              {employerMatches.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center space-y-3">
                  <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="font-semibold text-foreground">
                    No Employer Sponsored Pathways Identified
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Based on your current experience and matched occupations,
                    you do not currently meet the minimum requirements for
                    employer-sponsored visas.
                  </p>
                </div>
              ) : (
                employerMatches.map((occ, i) => {
                  const isMltssl = occ.list === "MLTSSL";
                  const isCsol = occ.list === "CSOL" || occ.list === "MLTSSL";
                  const auExpYears = parseExperienceYears(
                    formData.australianExperience ?? "",
                  );
                  const offshoreYears = parseExperienceYears(
                    formData.experience ?? "",
                  );
                  const totalYears = auExpYears + offshoreYears;

                  const eligibility = getEmployerEligibility(
                    isMltssl,
                    isCsol,
                    auExpYears,
                    totalYears,
                  );

                  return (
                    <div
                      key={occ.anzsco_code}
                      className={`animate-reveal-up delay-${Math.min((i + 1) * 100, 600)}`}
                    >
                      <EmployerCard
                        occupation={occ}
                        eligibility={eligibility}
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pathway CTA - below tab content, above sticky bottom bar */}
        <div className="animate-reveal-up delay-300" data-testid="pathway-cta">
          <Link
            href="/pathway"
            className="glass-card glow-amber group flex w-full items-center justify-between rounded-2xl px-6 py-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              borderColor: "oklch(0.78 0.12 70 / 0.4)",
            }}
          >
            <div className="space-y-1">
              <p
                className="font-display text-lg font-semibold italic"
                style={{ color: "oklch(0.78 0.12 70)" }}
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
              style={{ color: "oklch(0.78 0.12 70)" }}
            />
          </Link>
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        data-testid="sticky-cta"
      >
        <div
          className="border-t backdrop-blur-xl"
          style={{
            background: "var(--background)",
            borderColor: "var(--surface-border)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center px-6 py-4">
            {primaryAssessingBody && isACSBody(primaryAssessingBody) ? (
              <button
                className="w-full max-w-md rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] glow-amber"
                onClick={handleStartDocPrep}
                data-testid="start-doc-prep-btn"
              >
                Start Your Skill Assessment
              </button>
            ) : (
              <div className="w-full max-w-md text-center space-y-2">
                <button
                  className="w-full rounded-xl py-4 font-semibold transition-all duration-300 cursor-not-allowed opacity-50"
                  style={{
                    background: "var(--surface-2)",
                    color: "oklch(0.50 0.02 260)",
                  }}
                  disabled
                  data-testid="start-doc-prep-btn"
                >
                  Skill Assessment Coming Soon
                </button>
                <p className="text-xs text-muted-foreground/60">
                  We currently support ACS (Australian Computer Society) assessments only.
                  More assessing bodies coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultEmail={gateEmail}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { MatchResult } from "@/types/assessment";
import type { StateEligibility } from "@/lib/state-nominations";
import type { PossibilityRating } from "@/lib/pathway-signals";
import { MatchBadge } from "./MatchBadge";
import { PointsGap } from "./PointsGap";
import { StatGrid } from "./StatGrid";
import { PathwaySignals } from "./PathwaySignals";
import { StateNominationMatrix } from "./StateNominationMatrix";
import { InvitationTrend, type InvitationRound } from "./InvitationTrend";

interface OccupationCardProps {
  occupation: MatchResult;
  rank: number;
  userPoints: number;
  listStatus: string;
  possibility: PossibilityRating;
  stateNomCount: number;
  stateEligibility: StateEligibility[];
  pathwaySignals: string[];
  stateInvitingSummary?: string;
  bestStateRecommendation?: string;
}

const AGENT_BOOKING_URL =
  process.env.NEXT_PUBLIC_AGENT_BOOKING_URL || "#book-consultation";

/** Known assessing body website URLs */
const ASSESSING_BODY_URLS: Record<string, string> = {
  ACS: "https://www.acs.org.au",
  "Australian Computer Society": "https://www.acs.org.au",
  EA: "https://www.engineersaustralia.org.au",
  "Engineers Australia": "https://www.engineersaustralia.org.au",
  VETASSESS: "https://www.vetassess.com.au",
  TRA: "https://www.tradesrecognitionaustralia.gov.au",
  "Trades Recognition Australia": "https://www.tradesrecognitionaustralia.gov.au",
  AACA: "https://www.aaca.org.au",
  AIMS: "https://www.aims.org.au",
  AIQS: "https://www.aiqs.com.au",
  ANMAC: "https://www.anmac.org.au",
  CAANZ: "https://www.charteredaccountantsanz.com",
  CPA: "https://www.cpaaustralia.com.au",
  "CPA Australia": "https://www.cpaaustralia.com.au",
  NAATI: "https://www.naati.com.au",
};

/**
 * Full occupation card restructured to 8-row spec per CTO Brief v2 section 2.4.
 * Order: (1) ID + label, (2) Points signal, (3) 4 tiles, (4) Assessing body,
 * (5) Why this occupation (bullets), (6) Risks, (7) Pathway signals, (8) State matrix.
 */
export function OccupationCard({
  occupation,
  rank,
  userPoints,
  listStatus,
  possibility,
  stateNomCount,
  stateEligibility,
  pathwaySignals,
  stateInvitingSummary,
  bestStateRecommendation,
}: OccupationCardProps) {
  const [stateMatrixOpen, setStateMatrixOpen] = useState(false);

  // Extract best state name from recommendation string for matrix highlighting
  const bestStateName = bestStateRecommendation
    ? bestStateRecommendation.match(/Best state for you: (\w+)/)?.[1]
    : undefined;

  // Parse reasoning into bullet points (split on newline or numbered list patterns)
  const reasoningBullets = occupation.reasoning
    ? occupation.reasoning
        .split(/\n|(?:\d+\.\s)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return (
    <div
      id={`occ-${occupation.anzsco_code}`}
      className={`glass-card rounded-2xl p-6 space-y-5 transition-all duration-300 ${
        rank === 0 ? "glow-primary" : ""
      }`}
      style={
        rank === 0
          ? { borderColor: "oklch(0.62 0.17 250 / 0.3)" }
          : undefined
      }
      data-testid="occupation-card"
    >
      {/* ROW 1: Occupation identifier + label */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={
              rank === 0
                ? {
                    background: "oklch(0.62 0.17 250)",
                    color: "oklch(0.13 0.01 260)",
                  }
                : {
                    background: "var(--bar-track)",
                    color: "oklch(0.60 0.02 260)",
                  }
            }
          >
            #{rank + 1}
          </span>
          <div>
            <h3
              className="text-lg font-bold text-foreground leading-snug"
              data-testid="occ-title"
            >
              {occupation.title}
            </h3>
            <p
              className="text-sm text-muted-foreground mt-0.5"
              data-testid="occ-anzsco"
            >
              ANZSCO {occupation.anzsco_code}
            </p>
          </div>
        </div>
        <MatchBadge confidence={occupation.confidence} />
      </div>

      {/* ROW 2: Points signal */}
      <PointsGap
        userPoints={userPoints}
        threshold={occupation.min_189_points}
      />

      {/* ROW 3: 4 data tiles */}
      <StatGrid
        listStatus={listStatus}
        min189Points={occupation.min_189_points}
        possibility={possibility}
        stateNomCount={stateNomCount}
      />

      {/* ROW 4: Assessing body tile (links to website per CTO Brief 2.4) */}
      {occupation.assessing_authority &&
        occupation.assessing_authority !== "See relevant authority" && (() => {
          const bodyUrl = ASSESSING_BODY_URLS[occupation.assessing_authority] ||
            ASSESSING_BODY_URLS[occupation.assessing_authority.toUpperCase()];
          const Wrapper = bodyUrl ? "a" : "div";
          const wrapperProps = bodyUrl
            ? { href: bodyUrl, target: "_blank", rel: "noopener noreferrer" }
            : {};

          return (
            <Wrapper
              {...wrapperProps}
              className={`rounded-xl p-4 block ${bodyUrl ? "hover:bg-white/[0.03] transition-colors cursor-pointer" : ""}`}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--surface-border-subtle)",
              }}
            >
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Skill Assessing Body
              </p>
              <div className="flex items-center justify-between">
                <p
                  className="text-sm font-semibold text-foreground"
                  data-testid="occ-authority"
                >
                  {occupation.assessing_authority}
                </p>
                {bodyUrl && (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </Wrapper>
          );
        })()}

      {/* ROW 5: Why this occupation (bullet points, not paragraph) */}
      {reasoningBullets.length > 0 && (
        <div data-testid="match-reasoning">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Why this occupation
          </p>
          <ul className="space-y-1.5">
            {reasoningBullets.map((bullet, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
              >
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full"
                  style={{ background: "oklch(0.62 0.17 250)" }}
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ROW 6: Risks to be aware of */}
      {occupation.warnings.length > 0 && (
        <div className="space-y-2" data-testid="match-warnings">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Risks to be aware of
          </p>
          {occupation.warnings.map((warning, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 flex items-start gap-2"
              style={{
                background: "oklch(0.65 0.2 25 / 0.08)",
                border: "1px solid oklch(0.65 0.2 25 / 0.2)",
              }}
            >
              <AlertTriangle
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: "oklch(0.65 0.2 25)" }}
              />
              <p className="text-xs" style={{ color: "oklch(0.65 0.2 25)" }}>
                {warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ROW 7: Pathway signals */}
      <PathwaySignals signals={pathwaySignals} />

      {/* Invitation trend (last 3 rounds) per CTO Brief 3.2 */}
      {(() => {
        // Use invitation_rounds if available, otherwise construct from latest_invitation
        const rounds: InvitationRound[] = occupation.invitation_rounds
          ? occupation.invitation_rounds
              .filter((r) => r.round_date)
              .map((r) => ({
                round_date: r.round_date!,
                minimum_points: r.minimum_points,
                invitations_issued: r.invitations_issued,
              }))
          : occupation.latest_invitation?.round_date
            ? [{
                round_date: occupation.latest_invitation.round_date,
                minimum_points: occupation.latest_invitation.minimum_points,
                invitations_issued: occupation.latest_invitation.invitations_issued,
              }]
            : [];

        return rounds.length > 0 ? <InvitationTrend rounds={rounds} /> : null;
      })()}

      {/* ROW 8: State nomination matrix */}
      {/* Best state recommendation */}
      {bestStateRecommendation && (
        <p
          className="text-sm font-medium"
          style={{ color: "oklch(0.72 0.17 155)" }}
          data-testid="best-state"
        >
          {bestStateRecommendation}
        </p>
      )}

      {/* State invitation summary */}
      {stateInvitingSummary && (
        <div className="text-sm text-muted-foreground" data-testid="state-summary">
          {stateInvitingSummary}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setStateMatrixOpen(!stateMatrixOpen)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="toggle-state-matrix"
        >
          {stateMatrixOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {stateMatrixOpen ? "Hide state details" : "Show all states"}
        </button>
        {stateMatrixOpen && (
          <div className="mt-3">
            <StateNominationMatrix eligibility={stateEligibility} highlightedState={bestStateName} />
          </div>
        )}
      </div>
    </div>
  );
}

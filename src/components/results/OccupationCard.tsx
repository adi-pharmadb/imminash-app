"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import type { MatchResult, LatestInvitation } from "@/types/assessment";
import type { StateEligibility } from "@/lib/state-nominations";
import type { PossibilityRating } from "@/lib/pathway-signals";
import { isWeakMatch } from "@/lib/occupation-matching";
import { MatchBadge } from "./MatchBadge";
import { PointsGap } from "./PointsGap";
import { StatGrid } from "./StatGrid";
import { PathwaySignals } from "./PathwaySignals";
import { StateNominationMatrix } from "./StateNominationMatrix";

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
}

const AGENT_BOOKING_URL = "#book-consultation";
const ACS_BODIES = ["ACS", "Australian Computer Society"];

function isACSAuthority(authority: string | null): boolean {
  if (!authority) return false;
  return ACS_BODIES.some((body) => authority.toLowerCase().includes(body.toLowerCase()));
}

/**
 * Full occupation card with confidence scoring, reasoning, warnings,
 * state summary, invitation data, and agent booking CTAs.
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
}: OccupationCardProps) {
  const [stateMatrixOpen, setStateMatrixOpen] = useState(false);
  const weak = isWeakMatch(occupation.confidence);
  const showAgentCTA = weak || !isACSAuthority(occupation.assessing_authority);

  return (
    <div
      className={`glass-card rounded-2xl p-6 space-y-5 transition-all duration-300 ${
        rank === 0 ? "glow-amber" : ""
      }`}
      style={
        rank === 0
          ? { borderColor: "oklch(0.78 0.12 70 / 0.3)" }
          : undefined
      }
      data-testid="occupation-card"
    >
      {/* Weak match warning banner */}
      {weak && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2.5"
          style={{
            background: "oklch(0.65 0.2 25 / 0.1)",
            border: "1px solid oklch(0.65 0.2 25 / 0.25)",
          }}
          data-testid="weak-match-banner"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "oklch(0.65 0.2 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.65 0.2 25)" }}>
            This match may not be strong enough for a successful application
          </p>
        </div>
      )}

      {/* Header: rank, title, badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={
              rank === 0
                ? {
                    background: "oklch(0.78 0.12 70)",
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

      {/* Why it matched - reasoning */}
      {occupation.reasoning && (
        <div data-testid="match-reasoning">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {occupation.reasoning}
          </p>
        </div>
      )}

      {/* Warnings */}
      {occupation.warnings.length > 0 && (
        <div className="space-y-2" data-testid="match-warnings">
          {occupation.warnings.map((warning, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 flex items-start gap-2"
              style={{
                background: "oklch(0.78 0.12 70 / 0.08)",
                border: "1px solid oklch(0.78 0.12 70 / 0.2)",
              }}
            >
              <AlertTriangle
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: "oklch(0.78 0.12 70)" }}
              />
              <p className="text-xs" style={{ color: "oklch(0.78 0.12 70)" }}>
                {warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Points gap */}
      <PointsGap
        userPoints={userPoints}
        threshold={occupation.min_189_points}
      />

      {/* Stat grid */}
      <StatGrid
        listStatus={listStatus}
        min189Points={occupation.min_189_points}
        possibility={possibility}
        stateNomCount={stateNomCount}
      />

      {/* Latest invitation round */}
      {occupation.latest_invitation && occupation.latest_invitation.round_date && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--surface-border-subtle)",
          }}
          data-testid="invitation-round"
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <span className="text-muted-foreground">Latest round: </span>
            <span className="font-medium text-foreground">
              {occupation.latest_invitation.round_date}
            </span>
            {occupation.latest_invitation.minimum_points !== null && (
              <>
                <span className="text-muted-foreground"> / Min points: </span>
                <span className="font-medium text-foreground">
                  {occupation.latest_invitation.minimum_points}
                </span>
              </>
            )}
            {occupation.latest_invitation.invitations_issued !== null && (
              <>
                <span className="text-muted-foreground"> / Issued: </span>
                <span className="font-medium text-foreground">
                  {occupation.latest_invitation.invitations_issued}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assessing body */}
      {occupation.assessing_authority &&
        occupation.assessing_authority !== "See relevant authority" && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--surface-border-subtle)",
            }}
          >
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Skill Assessing Body
            </p>
            <p
              className="text-sm font-semibold text-foreground"
              data-testid="occ-authority"
            >
              {occupation.assessing_authority}
            </p>
          </div>
        )}

      {/* Pathway signals */}
      <PathwaySignals signals={pathwaySignals} />

      {/* State invitation summary */}
      {stateInvitingSummary && (
        <div className="text-sm text-muted-foreground" data-testid="state-summary">
          {stateInvitingSummary}
        </div>
      )}

      {/* State nomination matrix (collapsible) */}
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
            <StateNominationMatrix eligibility={stateEligibility} />
          </div>
        )}
      </div>

      {/* Agent booking CTA */}
      {showAgentCTA && (
        <a
          href={AGENT_BOOKING_URL}
          className="block rounded-xl p-4 transition-all hover:scale-[1.01]"
          style={{
            background: "oklch(0.78 0.12 70 / 0.08)",
            border: "1px solid oklch(0.78 0.12 70 / 0.2)",
          }}
          data-testid="agent-cta"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "oklch(0.78 0.12 70)" }} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Need help with this occupation?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Book a consultation with Kunal to explore your options
              </p>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

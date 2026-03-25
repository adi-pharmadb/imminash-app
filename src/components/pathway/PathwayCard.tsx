"use client";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Clock,
  MapPin,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import type { PathwayResult } from "@/lib/visa-pathway-engine";
import type { PointsBreakdown } from "@/types/assessment";
import { PathwayTimeline } from "./PathwayTimeline";

interface PathwayCardProps {
  pathway: PathwayResult;
  userPoints: number;
  breakdown: PointsBreakdown;
}

const RATING_CONFIG: Record<
  string,
  { color: string; bg: string; Icon: typeof CheckCircle; label: string }
> = {
  Strong: {
    color: "oklch(0.72 0.17 155)",
    bg: "oklch(0.72 0.17 155 / 0.12)",
    Icon: CheckCircle,
    label: "Strong",
  },
  Competitive: {
    color: "oklch(0.62 0.17 250)",
    bg: "oklch(0.62 0.17 250 / 0.12)",
    Icon: AlertTriangle,
    label: "Competitive",
  },
  "Gap Exists": {
    color: "oklch(0.70 0.15 50)",
    bg: "oklch(0.70 0.15 50 / 0.12)",
    Icon: MinusCircle,
    label: "Gap Exists",
  },
  "Not Available": {
    color: "oklch(0.40 0.02 260)",
    bg: "oklch(0.40 0.02 260 / 0.12)",
    Icon: XCircle,
    label: "Not Available",
  },
};

/**
 * Individual visa pathway card showing rating, points comparison,
 * state availability, processing time, timeline, and next steps.
 */
export function PathwayCard({ pathway, userPoints, breakdown }: PathwayCardProps) {
  const config = RATING_CONFIG[pathway.rating] ?? RATING_CONFIG["Not Available"];
  const { color, bg, Icon } = config;

  const invitingStates190 = pathway.stateEligibility.filter(
    (s) => s.visa_190 === true,
  );
  const invitingStates491 = pathway.stateEligibility.filter(
    (s) => s.visa_491 === true,
  );
  const hasStates = invitingStates190.length > 0 || invitingStates491.length > 0;

  const targetPoints = pathway.cutoff ?? 65;
  const pointsAboveTarget = pathway.effectivePoints - targetPoints;
  const showBar = pathway.cutoff !== null;
  // Use the target as the reference scale. Bar fills to 100% at target.
  // Points beyond target overflow visually capped at 100%.
  const currentPct = targetPoints > 0
    ? Math.min((pathway.effectivePoints / targetPoints) * 100, 100)
    : 100;

  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-5"
      data-testid="pathway-card"
    >
      {/* Header: visa name + rating badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3
            className="text-lg font-bold text-foreground leading-snug"
            data-testid="pathway-visa-name"
          >
            {pathway.visaName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {pathway.reasoning}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: bg, color }}
          data-testid="pathway-rating"
        >
          <Icon className="h-3.5 w-3.5" />
          {pathway.rating}
        </span>
      </div>

      {/* Points comparison */}
      {showBar && (
        <div className="space-y-2" data-testid="pathway-points-bar">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Your points: <span className="font-semibold text-foreground">{pathway.effectivePoints}</span>
              {pathway.bonusPoints > 0 && (
                <span style={{ color: "oklch(0.72 0.17 155)" }}>
                  {" "}(incl. +{pathway.bonusPoints} bonus)
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              Min required: <span className="font-semibold text-foreground">{targetPoints}</span>
            </span>
          </div>
          {/* Only show the bar when there's a meaningful gap to visualize */}
          {pointsAboveTarget < 20 ? (
            <div className="relative h-2 w-full rounded-full overflow-hidden"
              style={{ background: "var(--bar-track)" }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${currentPct}%`,
                  background: pathway.effectivePoints >= targetPoints
                    ? "oklch(0.72 0.17 155)"
                    : "oklch(0.70 0.15 50)",
                }}
              />
              {/* Target marker at 100% of bar (right edge) */}
              <div
                className="absolute top-0 right-0 h-full w-0.5"
                style={{ background: "var(--bar-marker)" }}
              />
            </div>
          ) : (
            <p
              className="text-xs font-medium"
              style={{ color: "oklch(0.72 0.17 155)" }}
            >
              +{pointsAboveTarget} points above the minimum threshold
            </p>
          )}
        </div>
      )}

      {/* States available as chips (for 190/491) */}
      {hasStates && (
        <div className="space-y-2" data-testid="pathway-states">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            States Nominating
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...invitingStates190, ...invitingStates491].map((s) => s.state))].map(
              (state) => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "oklch(0.72 0.17 155 / 0.1)",
                    color: "oklch(0.72 0.17 155)",
                    border: "1px solid oklch(0.72 0.17 155 / 0.2)",
                  }}
                >
                  <MapPin className="h-3 w-3" />
                  {state}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {/* Processing time */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--surface-border-subtle)",
        }}
        data-testid="pathway-processing-time"
      >
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <span className="text-muted-foreground">Processing: </span>
          <span className="font-medium text-foreground">
            {pathway.processingTime.range}
          </span>
          <span className="text-muted-foreground"> / </span>
          <span className="text-muted-foreground">
            {pathway.processingTime.typical}
          </span>
        </div>
      </div>

      {/* Timeline to PR */}
      <PathwayTimeline
        visa={pathway.visa}
        processingTime={pathway.processingTime}
        timelineToPR={pathway.timelineToPR.description}
      />

      {/* Next steps */}
      {pathway.nextSteps.length > 0 && (
        <div className="space-y-2" data-testid="pathway-next-steps">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Next Steps
          </p>
          <ul className="space-y-2">
            {pathway.nextSteps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed"
              >
                <ArrowRight
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "oklch(0.62 0.17 250)" }}
                />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Points improvement suggestions (if gap exists) */}
      {pathway.gapAnalysis && pathway.gapAnalysis.suggestions.length > 0 && (
        <div className="space-y-2" data-testid="pathway-suggestions">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Lightbulb
              className="inline h-3.5 w-3.5 mr-1"
              style={{ color: "oklch(0.62 0.17 250)" }}
            />
            Points Improvement Suggestions
          </p>
          <div className="space-y-2">
            {pathway.gapAnalysis.suggestions
              .filter((s) => s.available)
              .slice(0, 3)
              .map((suggestion, i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2 flex items-start justify-between gap-3"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--surface-border-subtle)",
                  }}
                >
                  <div className="text-sm text-foreground leading-relaxed">
                    {suggestion.action}
                    <span className="text-muted-foreground ml-1">
                      ({suggestion.timeframe})
                    </span>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{
                      background: "oklch(0.72 0.17 155 / 0.12)",
                      color: "oklch(0.72 0.17 155)",
                    }}
                  >
                    +{suggestion.pointsGain}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

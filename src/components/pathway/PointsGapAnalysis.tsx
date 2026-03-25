"use client";

import { TrendingUp, Zap } from "lucide-react";
import type { PointsImprovement } from "@/lib/points-gap";

interface PointsGapAnalysisProps {
  currentPoints: number;
  targetPoints: number;
  suggestions: PointsImprovement[];
}

const FEASIBILITY_STYLES: Record<string, { bg: string; color: string }> = {
  Easy: { bg: "oklch(0.72 0.17 155 / 0.12)", color: "oklch(0.72 0.17 155)" },
  Moderate: { bg: "oklch(0.78 0.12 70 / 0.12)", color: "oklch(0.78 0.12 70)" },
  Hard: { bg: "oklch(0.70 0.15 50 / 0.12)", color: "oklch(0.70 0.15 50)" },
};

/**
 * Visual points gap analysis with ranked improvement suggestions.
 * Shows a points bar and highlights which suggestions can bridge the gap.
 */
export function PointsGapAnalysis({
  currentPoints,
  targetPoints,
  suggestions,
}: PointsGapAnalysisProps) {
  const gap = Math.max(0, targetPoints - currentPoints);
  if (gap === 0) return null;

  // Use target as the 100% reference so the bar clearly shows the gap
  const currentWidth = targetPoints > 0
    ? Math.min((currentPoints / targetPoints) * 100, 100)
    : 0;

  // Calculate cumulative points to show which suggestions bridge the gap
  let cumulative = currentPoints;
  const withCumulative = suggestions
    .filter((s) => s.available)
    .map((s) => {
      cumulative += s.pointsGain;
      return { ...s, cumulativeTotal: cumulative, bridgesGap: cumulative >= targetPoints };
    });

  // Check if gap can be bridged with 190 (+5) or 491 (+15)
  const bridgesWith190 = currentPoints + 5 >= targetPoints;
  const bridgesWith491 = currentPoints + 15 >= targetPoints;

  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-5"
      data-testid="points-gap-analysis"
    >
      <div className="flex items-center gap-2.5">
        <TrendingUp className="h-5 w-5" style={{ color: "oklch(0.78 0.12 70)" }} />
        <h3 className="font-display text-lg italic text-foreground">
          Points Gap Analysis
        </h3>
      </div>

      {/* Gap summary */}
      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="gap-amount">
        You need <span className="font-bold text-foreground">{gap} more points</span> to
        reach the {targetPoints}-point target for Subclass 189.
      </p>

      {/* Visual points bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Current: {currentPoints}</span>
          <span>Target: {targetPoints}</span>
        </div>
        <div
          className="relative h-3 w-full rounded-full overflow-hidden"
          style={{ background: "oklch(0.22 0.015 260)" }}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${currentWidth}%`,
              background: "oklch(0.70 0.15 50)",
            }}
          />
          {/* Target marker at right edge (100%) */}
          <div
            className="absolute top-0 right-0 h-full w-0.5"
            style={{ background: "oklch(0.93 0.01 80 / 0.6)" }}
          />
        </div>
      </div>

      {/* Bonus bridge highlights */}
      {(bridgesWith190 || bridgesWith491) && (
        <div className="space-y-2">
          {bridgesWith190 && (
            <div
              className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
              style={{
                background: "oklch(0.72 0.17 155 / 0.08)",
                border: "1px solid oklch(0.72 0.17 155 / 0.2)",
              }}
              data-testid="bridge-190"
            >
              <Zap className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.17 155)" }} />
              <span style={{ color: "oklch(0.72 0.17 155)" }}>
                The +5 state nomination bonus (190) bridges this gap
              </span>
            </div>
          )}
          {bridgesWith491 && (
            <div
              className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
              style={{
                background: "oklch(0.72 0.17 155 / 0.08)",
                border: "1px solid oklch(0.72 0.17 155 / 0.2)",
              }}
              data-testid="bridge-491"
            >
              <Zap className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.17 155)" }} />
              <span style={{ color: "oklch(0.72 0.17 155)" }}>
                The +15 regional bonus (491) bridges this gap
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ranked improvement suggestions */}
      {withCumulative.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Improvement Suggestions
          </p>
          <div className="space-y-2">
            {withCumulative.map((suggestion, i) => {
              const feasStyle = FEASIBILITY_STYLES[suggestion.feasibility] ?? FEASIBILITY_STYLES.Moderate;
              return (
                <div
                  key={i}
                  className="rounded-xl p-3 flex items-start justify-between gap-3"
                  style={{
                    background: "oklch(0.18 0.012 260 / 0.8)",
                    border: suggestion.bridgesGap
                      ? "1px solid oklch(0.72 0.17 155 / 0.3)"
                      : "1px solid oklch(0.28 0.015 260 / 0.4)",
                  }}
                  data-testid="gap-suggestion"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {suggestion.action}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{suggestion.timeframe}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: feasStyle.bg, color: feasStyle.color }}
                      >
                        {suggestion.feasibility}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{
                      background: "oklch(0.72 0.17 155 / 0.12)",
                      color: "oklch(0.72 0.17 155)",
                    }}
                    data-testid="suggestion-points"
                  >
                    +{suggestion.pointsGain}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

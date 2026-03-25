"use client";

import type { PointsBreakdown } from "@/types/assessment";

interface PointsBreakdownCardProps {
  breakdown: PointsBreakdown;
  minRequired: number | null;
}

/**
 * Detailed points breakdown showing each category with current/max values.
 */
export function PointsBreakdownCard({
  breakdown,
  minRequired,
}: PointsBreakdownCardProps) {
  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-5"
      data-testid="points-breakdown"
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-lg italic text-foreground">
          Points Breakdown
        </p>
        <span
          className="rounded-full px-4 py-1.5 text-sm font-bold glow-amber animate-pulse-glow"
          style={{
            background: "oklch(0.78 0.12 70 / 0.15)",
            color: "oklch(0.78 0.12 70)",
          }}
        >
          {breakdown.total} pts
        </span>
      </div>
      <div className="space-y-3">
        {breakdown.items.map((item) => {
          const ratio = item.max > 0 ? item.points / item.max : 0;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">
                  {item.points} / {item.max}
                </span>
              </div>
              <div
                className="h-1 w-full rounded-full overflow-hidden"
                style={{ background: "var(--bar-track)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(ratio * 100, 100)}%`,
                    background:
                      ratio >= 1
                        ? "oklch(0.72 0.17 155)"
                        : "oklch(0.78 0.12 70)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {minRequired !== null && (
        <div
          className="border-t pt-4 text-sm text-muted-foreground"
          style={{ borderColor: "oklch(0.24 0.015 260 / 0.5)" }}
        >
          Minimum 189 threshold:{" "}
          <span className="font-semibold text-foreground">
            {minRequired} pts
          </span>
        </div>
      )}
    </div>
  );
}

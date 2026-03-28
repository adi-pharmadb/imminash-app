"use client";

/**
 * Invitation round trend component.
 * Shows last 3 invitation rounds per occupation with trend arrow.
 * Green down arrow = easier (points decreasing), red up arrow = harder.
 * CTO Brief v2 section 3.2
 */

import { TrendingDown, TrendingUp, Minus, Calendar } from "lucide-react";

export interface InvitationRound {
  round_date: string;
  minimum_points: number | null;
  invitations_issued: number | null;
}

interface InvitationTrendProps {
  rounds: InvitationRound[];
}

function getTrend(rounds: InvitationRound[]): "down" | "up" | "stable" | null {
  const withPoints = rounds.filter((r) => r.minimum_points !== null);
  if (withPoints.length < 2) return null;

  const latest = withPoints[0].minimum_points!;
  const previous = withPoints[withPoints.length - 1].minimum_points!;

  if (latest < previous) return "down";
  if (latest > previous) return "up";
  return "stable";
}

export function InvitationTrend({ rounds }: InvitationTrendProps) {
  if (rounds.length === 0) return null;

  const trend = getTrend(rounds);

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--surface-border-subtle)",
      }}
      data-testid="invitation-trend"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Invitation Rounds
          </p>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === "down" && (
              <>
                <TrendingDown
                  className="h-3.5 w-3.5"
                  style={{ color: "oklch(0.72 0.17 155)" }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "oklch(0.72 0.17 155)" }}
                >
                  Easier
                </span>
              </>
            )}
            {trend === "up" && (
              <>
                <TrendingUp
                  className="h-3.5 w-3.5"
                  style={{ color: "oklch(0.65 0.2 25)" }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "oklch(0.65 0.2 25)" }}
                >
                  Harder
                </span>
              </>
            )}
            {trend === "stable" && (
              <>
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Stable
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {rounds.slice(0, 3).map((round, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">{round.round_date}</span>
            <div className="flex items-center gap-4">
              {round.minimum_points !== null && (
                <span className="font-medium text-foreground">
                  {round.minimum_points} pts
                </span>
              )}
              {round.invitations_issued !== null && (
                <span className="text-xs text-muted-foreground">
                  {round.invitations_issued} issued
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {rounds.length < 3 && (
        <p className="text-[10px] text-muted-foreground/60">
          Limited invitation history available for this occupation.
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * Personalised summary card at top of results page.
 * Shows one-sentence summary and anchor navigation boxes.
 * CTO Brief v2 section 2.1
 */

import { ArrowDown } from "lucide-react";
import type { PointsBreakdown, MatchResult } from "@/types/assessment";

interface SummaryCardProps {
  firstName: string;
  breakdown: PointsBreakdown;
  skillsMatches: MatchResult[];
  stateCount: number;
}

export function SummaryCard({
  firstName,
  breakdown,
  skillsMatches,
  stateCount,
}: SummaryCardProps) {
  const matchCount = skillsMatches.length;
  const topOcc = skillsMatches[0];

  // Build one-sentence summary
  const parts: string[] = [];
  parts.push(`You scored **${breakdown.total} points**`);
  if (matchCount > 0) {
    parts.push(`matched ${matchCount} occupation${matchCount !== 1 ? "s" : ""}`);
  }
  if (stateCount > 0) {
    parts.push(`and are eligible for nomination in ${stateCount} state${stateCount !== 1 ? "s" : ""}`);
  }
  const summary = parts.join(", ") + ".";

  const anchors = [
    {
      label: "Points Breakdown",
      target: "points-breakdown",
      value: `${breakdown.total} pts`,
    },
    ...skillsMatches.slice(0, 3).map((occ, i) => ({
      label: `#${i + 1} Match`,
      target: `occ-${occ.anzsco_code}`,
      value: occ.title.length > 20 ? occ.title.slice(0, 18) + "..." : occ.title,
    })),
  ];

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5" data-testid="summary-card">
      {/* Summary sentence */}
      <p
        className="text-sm text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: summary.replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="text-foreground font-semibold">$1</strong>',
          ),
        }}
      />

      {/* Anchor navigation boxes */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {anchors.map((anchor) => (
          <button
            key={anchor.target}
            onClick={() => {
              document
                .getElementById(anchor.target)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="glass-card group rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {anchor.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground truncate">
              {anchor.value}
            </p>
            <ArrowDown
              className="mt-1 h-3 w-3 text-muted-foreground/40 transition-transform group-hover:translate-y-0.5"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

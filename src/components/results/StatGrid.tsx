"use client";

import { CheckCircle, AlertTriangle, XCircle, MapPin } from "lucide-react";
import type { PossibilityRating } from "@/lib/pathway-signals";

const POSSIBILITY_ICONS: Record<PossibilityRating, typeof CheckCircle> = {
  High: CheckCircle,
  Medium: AlertTriangle,
  Low: XCircle,
};

const POSSIBILITY_COLORS: Record<PossibilityRating, string> = {
  High: "oklch(0.72 0.17 155)",
  Medium: "oklch(0.62 0.17 250)",
  Low: "oklch(0.65 0.2 25)",
};

const ICON_BG_COLORS: Record<PossibilityRating, string> = {
  High: "oklch(0.72 0.17 155 / 0.12)",
  Medium: "oklch(0.62 0.17 250 / 0.12)",
  Low: "oklch(0.65 0.2 25 / 0.12)",
};

const LIST_EXPLANATIONS: Record<string, string> = {
  MLTSSL:
    "Medium and Long-term Strategic Skills List -- eligible for permanent visa pathways (189, 190, 491).",
  CSOL: "Combined List of Eligible Skilled Occupations -- eligible for employer-sponsored and some state-nominated visas.",
  STSOL:
    "Short-term Skilled Occupation List -- eligible for short-term employer-sponsored visas only.",
  ROL: "Regional Occupation List -- eligible for regional visa pathways only.",
};

interface StatGridProps {
  listStatus: string;
  min189Points: number | null;
  possibility: PossibilityRating;
  stateNomCount: number;
}

/**
 * 4-stat grid: List Status, 189 Min Points, Possibility, State Nomination count.
 */
export function StatGrid({
  listStatus,
  min189Points,
  possibility,
  stateNomCount,
}: StatGridProps) {
  const PossIcon = POSSIBILITY_ICONS[possibility];
  const possColor = POSSIBILITY_COLORS[possibility];
  const possIconBg = ICON_BG_COLORS[possibility];

  return (
    <div
      className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"
      data-testid="stat-grid"
    >
      {/* List Status */}
      <div
        className="glass-card rounded-xl p-3.5"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: "oklch(0.62 0.17 250 / 0.12)" }}
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: "oklch(0.62 0.17 250)" }}
            >
              L
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground"
            title={LIST_EXPLANATIONS[listStatus] ?? "Skilled occupation list."}
          >
            List Status
          </p>
        </div>
        <p className="font-semibold text-foreground" data-testid="stat-list">
          {listStatus}
        </p>
      </div>

      {/* 189 Min Points */}
      <div
        className="glass-card rounded-xl p-3.5"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: "oklch(0.65 0.15 250 / 0.12)" }}
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: "oklch(0.65 0.15 250)" }}
            >
              #
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">189 Min Points</p>
        </div>
        <p
          className="font-semibold"
          style={{
            color: min189Points !== null ? "var(--foreground)" : "oklch(0.65 0.2 25)",
          }}
          data-testid="stat-min189"
        >
          {min189Points !== null ? min189Points : "Not on 189 list"}
        </p>
      </div>

      {/* Possibility */}
      <div
        className="glass-card rounded-xl p-3.5"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: possIconBg }}
          >
            <PossIcon className="h-3 w-3" style={{ color: possColor }} />
          </div>
          <p className="text-[11px] text-muted-foreground">Possibility</p>
        </div>
        <div
          className="flex items-center gap-1.5 font-semibold"
          style={{ color: possColor }}
          data-testid="stat-possibility"
        >
          {possibility}
        </div>
      </div>

      {/* State Nomination */}
      <div
        className="glass-card rounded-xl p-3.5"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: "oklch(0.62 0.17 250 / 0.12)" }}
          >
            <MapPin
              className="h-3 w-3"
              style={{ color: "oklch(0.62 0.17 250)" }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">State Nomination</p>
        </div>
        <div className="flex items-center gap-1.5" data-testid="stat-statenom">
          <span
            className="font-semibold"
            style={{
              color:
                stateNomCount > 0
                  ? "oklch(0.72 0.17 155)"
                  : "oklch(0.60 0.02 260)",
            }}
          >
            {stateNomCount} state{stateNomCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

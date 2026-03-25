"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PointsGapProps {
  userPoints: number;
  threshold: number | null;
}

/**
 * Points gap indicator showing how far above or below the 189 threshold.
 */
export function PointsGap({ userPoints, threshold }: PointsGapProps) {
  if (threshold === null) return null;

  const diff = userPoints - threshold;

  let label: string;
  let color: string;
  let Icon: typeof TrendingUp;

  if (diff >= 0) {
    label = `${diff} points above threshold`;
    color = "oklch(0.72 0.17 155)";
    Icon = TrendingUp;
  } else if (Math.abs(diff) <= 10) {
    label = `${Math.abs(diff)} points below threshold`;
    color = "oklch(0.78 0.12 70)";
    Icon = Minus;
  } else {
    label = `${Math.abs(diff)} points below threshold`;
    color = "oklch(0.65 0.2 25)";
    Icon = TrendingDown;
  }

  return (
    <div
      className="flex items-center gap-2 text-sm font-semibold"
      style={{ color }}
      data-testid="points-gap"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className="font-normal text-muted-foreground">
        (189 threshold: {threshold} pts)
      </span>
    </div>
  );
}

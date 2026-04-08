"use client";

import { getConfidenceColor } from "@/lib/occupation-matching";

interface MatchBadgeProps {
  confidence: number;
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 70) return "Strong Match";
  if (confidence >= 50) return "Good Match";
  return "Weak Match";
}

export function MatchBadge({ confidence }: MatchBadgeProps) {
  const styles = getConfidenceColor(confidence);
  return (
    <span
      className="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        background: styles.bg,
        color: styles.text,
        boxShadow: styles.shadow,
      }}
      data-testid="match-badge"
    >
      {getConfidenceLabel(confidence)}
    </span>
  );
}

"use client";

import { getConfidenceColor } from "@/lib/occupation-matching";

interface MatchBadgeProps {
  confidence: number;
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
      {confidence}% Match
    </span>
  );
}

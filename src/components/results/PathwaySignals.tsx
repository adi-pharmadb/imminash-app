"use client";

import { Info } from "lucide-react";

interface PathwaySignalsProps {
  signals: string[];
}

/**
 * Rule-based pathway signal statements about 189/190/491 eligibility.
 */
export function PathwaySignals({ signals }: PathwaySignalsProps) {
  if (signals.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="pathway-signals">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Pathway Signals
      </p>
      <div
        className="space-y-2.5 pl-4"
        style={{ borderLeft: "2px solid oklch(0.78 0.12 70 / 0.3)" }}
      >
        {signals.map((signal, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed"
          >
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "oklch(0.78 0.12 70)" }}
            />
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

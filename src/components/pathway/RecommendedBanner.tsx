"use client";

import { Star } from "lucide-react";
import type { PathwayResult } from "@/lib/visa-pathway-engine";

interface RecommendedBannerProps {
  pathway: PathwayResult;
  reasoning: string;
}

/**
 * Highlighted banner card showing the #1 recommended pathway.
 * Uses amber glow border to stand out visually.
 */
export function RecommendedBanner({ pathway, reasoning }: RecommendedBannerProps) {
  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-4 glow-primary"
      style={{ borderColor: "oklch(0.62 0.17 250 / 0.4)" }}
      data-testid="recommended-banner"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "oklch(0.62 0.17 250 / 0.15)" }}
        >
          <Star
            className="h-4 w-4"
            style={{ color: "oklch(0.62 0.17 250)" }}
          />
        </div>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.62 0.17 250)" }}
          >
            Recommended Pathway
          </p>
          <h2
            className="font-display text-xl italic text-foreground"
            data-testid="recommended-visa"
          >
            {pathway.visaName}
          </h2>
        </div>
      </div>

      <p
        className="text-sm text-muted-foreground leading-relaxed"
        data-testid="recommended-reasoning"
      >
        {reasoning}
      </p>

      <a
        href={
          pathway.visa === "consultation"
            ? "https://calendly.com/studynash"
            : "/pathway#details"
        }
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "oklch(0.62 0.17 250)",
          color: "oklch(0.13 0.01 260)",
        }}
        data-testid="recommended-cta"
      >
        {pathway.visa === "consultation"
          ? "Book a Free Consultation"
          : "View Pathway Details"}
      </a>
    </div>
  );
}

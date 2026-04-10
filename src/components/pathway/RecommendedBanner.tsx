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
      style={{ borderColor: "color-mix(in oklch, var(--primary) 40%, transparent)" }}
      data-testid="recommended-banner"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
        >
          <Star
            className="h-4 w-4"
            style={{ color: "var(--primary)" }}
          />
        </div>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            Recommended Pathway
          </p>
          <h2
            className="font-display text-xl text-foreground"
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
            : "#recommended-pathway-details"
        }
        onClick={(e) => {
          if (pathway.visa === "consultation") return;
          e.preventDefault();
          const el = document.getElementById("recommended-pathway-details");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", "#recommended-pathway-details");
          }
        }}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
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

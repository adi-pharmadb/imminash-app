"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import type { PossibilityRating } from "@/lib/pathway-signals";

interface DualCTAProps {
  possibility: PossibilityRating;
  hasACSMatch: boolean;
  onStartDocPrep: () => void;
}

const SECONDARY_COPY: Record<PossibilityRating, string> = {
  High: "You're in a strong position \u2014 book a free call to plan your next steps",
  Medium:
    "Your pathway has complexity \u2014 a migration agent can significantly improve your chances",
  Low: "Your situation may need a different strategy \u2014 speak to our agents for a personalised plan",
};

const AGENT_BOOKING_URL =
  process.env.NEXT_PUBLIC_AGENT_BOOKING_URL || "#book-consultation";

/**
 * Contextual dual CTA that appears after the user has scrolled past occupation cards.
 * Primary: start doc prep. Secondary: book an agent call (copy varies by possibility).
 */
export function DualCTA({
  possibility,
  hasACSMatch,
  onStartDocPrep,
}: DualCTAProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinelRef} data-testid="dual-cta">
      <div
        className={`space-y-4 transition-all duration-700 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Primary CTA */}
        {hasACSMatch ? (
          <button
            className="w-full rounded-2xl bg-primary py-5 font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] glow-primary text-lg"
            onClick={onStartDocPrep}
            data-testid="primary-cta"
          >
            <span className="flex items-center justify-center gap-2">
              Prepare my skill assessment documents
              <ArrowRight className="h-5 w-5" />
            </span>
          </button>
        ) : (
          <div className="w-full text-center space-y-2">
            <button
              className="w-full rounded-2xl py-5 font-semibold transition-all duration-300 cursor-not-allowed opacity-50"
              style={{
                background: "var(--surface-2)",
                color: "oklch(0.50 0.02 260)",
              }}
              disabled
            >
              Skill Assessment Coming Soon
            </button>
            <p className="text-xs text-muted-foreground/60">
              We currently support ACS (Australian Computer Society) assessments
              only. More assessing bodies coming soon.
            </p>
          </div>
        )}

        {/* Secondary CTA - Agent booking */}
        <a
          href={AGENT_BOOKING_URL}
          className="glass-card group flex w-full items-center gap-4 rounded-2xl px-6 py-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            borderColor: "color-mix(in oklch, var(--primary) 25%, transparent)",
          }}
          data-testid="secondary-cta"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }}
          >
            <MessageCircle
              className="h-5 w-5"
              style={{ color: "var(--primary)" }}
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {SECONDARY_COPY[possibility]}
          </p>
        </a>
      </div>
    </div>
  );
}

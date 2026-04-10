"use client";

import { Briefcase, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import type { EmployerEligibility } from "@/lib/employer-eligibility";
import type { MatchResult } from "@/types/assessment";
import { isWeakMatch } from "@/lib/occupation-matching";
import { MatchBadge } from "./MatchBadge";

interface EmployerCardProps {
  occupation: MatchResult;
  eligibility: EmployerEligibility;
}

const AGENT_BOOKING_URL = "#book-consultation";

function EligibilityRow({
  label,
  eligible,
  reason,
}: {
  label: string;
  eligible: boolean;
  reason: string;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--surface-border-subtle)",
      }}
      data-testid={`eligibility-${label}`}
    >
      <div className="flex items-center gap-2">
        {eligible ? (
          <CheckCircle
            className="h-4 w-4"
            style={{ color: "var(--success)" }}
          />
        ) : (
          <XCircle
            className="h-4 w-4"
            style={{ color: "oklch(0.65 0.2 25)" }}
          />
        )}
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={
            eligible
              ? {
                  background: "color-mix(in oklch, var(--success) 15%, transparent)",
                  color: "var(--success)",
                }
              : {
                  background: "oklch(0.65 0.2 25 / 0.15)",
                  color: "oklch(0.65 0.2 25)",
                }
          }
        >
          {eligible ? "Eligible" : "Not Eligible"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>
    </div>
  );
}

/**
 * Employer sponsored occupation card with 186/482 eligibility,
 * confidence badge, reasoning, and agent CTA.
 */
export function EmployerCard({ occupation, eligibility }: EmployerCardProps) {
  const weak = isWeakMatch(occupation.confidence);

  return (
    <div
      className="glass-card rounded-2xl p-6 space-y-5"
      data-testid="employer-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }}
          >
            <Briefcase
              className="h-4 w-4"
              style={{ color: "var(--primary)" }}
            />
          </span>
          <div>
            <h4 className="font-bold text-foreground">{occupation.title}</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              ANZSCO {occupation.anzsco_code}
            </p>
          </div>
        </div>
        <MatchBadge confidence={occupation.confidence} />
      </div>

      {/* Why it matched - reasoning */}
      {occupation.reasoning && (
        <div data-testid="match-reasoning">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {occupation.reasoning}
          </p>
        </div>
      )}

      <EligibilityRow
        label="Visa 186"
        eligible={eligibility.visa_186.eligible}
        reason={eligibility.visa_186.reason}
      />
      <EligibilityRow
        label="Visa 482"
        eligible={eligibility.visa_482.eligible}
        reason={eligibility.visa_482.reason}
      />

      {/* Agent booking CTA for weak matches */}
      {weak && (
        <a
          href={AGENT_BOOKING_URL}
          className="block rounded-xl p-4 transition-all hover:scale-[1.01]"
          style={{
            background: "color-mix(in oklch, var(--primary) 8%, transparent)",
            border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
          }}
          data-testid="agent-cta"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Need help with this occupation?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Book a consultation with Kunal to explore your options
              </p>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

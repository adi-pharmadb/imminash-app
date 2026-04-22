"use client";

/**
 * PaywallMessage — inline card shown in the chat stream when the
 * conversation has reached status='awaiting_payment'. Hits
 * /api/create-checkout-session with the conversation id and redirects
 * to Stripe Checkout.
 */

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallMessageProps {
  conversationId: string;
  /**
   * Raw `assessing_authority` string from the selected match (e.g. "ACS",
   * "VETASSESS", "Engineers Australia"). Drives body-specific copy so the
   * paywall doesn't always say "ACS".
   */
  assessingAuthority?: string | null;
}

interface PaywallCopy {
  title: string;
  valueProp: string;
  ctaLabel: string;
}

const DEFAULT_COPY: PaywallCopy = {
  title: "Unlock your document workspace",
  valueProp:
    "Continue to have Imminash draft your employer references, build your document checklist, and walk you through submission. One-time payment of AUD 199.",
  ctaLabel: "Continue to payment",
};

const BODY_COPY: Record<string, PaywallCopy> = {
  ACS: {
    title: "Unlock your ACS document workspace",
    valueProp:
      "Continue to have Imminash draft your employer references, build your ACS document checklist, and walk you through submission. One-time payment of AUD 199.",
    ctaLabel: "Continue to payment",
  },
  VETASSESS: {
    title: "Unlock your VETASSESS document workspace",
    valueProp:
      "Continue to have Imminash draft your employer references, build your VETASSESS document checklist, and walk you through submission. One-time payment of AUD 199.",
    ctaLabel: "Continue to payment",
  },
  "Engineers Australia": {
    title: "Unlock your CDR workspace",
    valueProp:
      "Continue to have Imminash draft your Career Episodes, Summary Statement, and CPD log for Engineers Australia. One-time payment of AUD 199.",
    ctaLabel: "Continue to payment",
  },
  TRA: {
    title: "Unlock your TRA workspace",
    valueProp:
      "Continue to have Imminash draft your employer references and build your TRA document checklist. One-time payment of AUD 199.",
    ctaLabel: "Continue to payment",
  },
};

function resolveCopy(authority?: string | null): PaywallCopy {
  if (!authority) return DEFAULT_COPY;
  const trimmed = authority.trim();
  const up = trimmed.toUpperCase();
  if (up === "ACS" || up.includes("AUSTRALIAN COMPUTER SOCIETY")) return BODY_COPY.ACS;
  if (up.startsWith("VETASSESS")) return BODY_COPY.VETASSESS;
  if (up.includes("ENGINEERS AUSTRALIA")) return BODY_COPY["Engineers Australia"];
  if (up === "TRA" || up.includes("TRADES RECOGNITION")) return BODY_COPY.TRA;
  return DEFAULT_COPY;
}

export function PaywallMessage({
  conversationId,
  assessingAuthority,
}: PaywallMessageProps) {
  const copy = resolveCopy(assessingAuthority);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Checkout failed");
      }
      window.location.href = json.url;
    } catch (err) {
      console.error(err);
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="glass-card my-4 rounded-2xl border border-primary/30 p-5"
      data-testid="paywall-message"
    >
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {copy.title}
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        You have your points estimate and occupation matches.
        {" "}
        {copy.valueProp}
      </p>
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="glow-primary w-full bg-primary font-semibold text-primary-foreground hover:brightness-110"
        data-testid="paywall-cta"
      >
        {loading ? "Redirecting…" : copy.ctaLabel}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

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
}

export function PaywallMessage({ conversationId }: PaywallMessageProps) {
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
          Unlock your document workspace
        </span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        You have your points estimate and occupation matches. Continue to have
        Imminash draft your employer reference, build your document checklist,
        and walk you through submission. One-time payment of AUD 199.
      </p>
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="glow-primary w-full bg-primary font-semibold text-primary-foreground hover:brightness-110"
        data-testid="paywall-cta"
      >
        {loading ? "Redirecting…" : "Continue to payment"}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

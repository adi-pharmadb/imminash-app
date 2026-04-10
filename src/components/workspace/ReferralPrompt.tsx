"use client";

/**
 * Referral Prompt: modal shown after successful ZIP download.
 * Offers a copy-link for sharing and a dismiss button.
 */

import { useState } from "react";
import { X, Copy, Check, Share2 } from "lucide-react";

interface ReferralPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralPrompt({ open, onOpenChange }: ReferralPromptProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}?ref=share`
    : "https://imminash.com?ref=share";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        data-testid="referral-prompt"
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="text-center space-y-4">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklch, var(--primary) 10%, transparent)" }}
          >
            <Share2 className="h-5 w-5" style={{ color: "var(--primary)" }} />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-lg text-foreground">
              Know someone applying for PR?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share imminash with a friend or colleague who needs help with their
              skills assessment documents.
            </p>
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/30 px-3 py-2">
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {referralUrl}
            </span>
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all hover:brightness-110"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

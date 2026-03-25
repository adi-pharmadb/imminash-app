"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

/**
 * Auth modal for magic link authentication.
 * Pre-fills email from the email gate submission. [AC-AU1]
 * Sends a Supabase magic link and shows confirmation state.
 */
export function AuthModal({ open, onOpenChange, defaultEmail = "" }: AuthModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendMagicLink() {
    if (!email) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError("Failed to send login link. Please try again.");
      return;
    }

    setSent(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSent(false);
      setError(null);
      setLoading(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-md" data-testid="auth-modal">
        <DialogHeader className="space-y-3">
          <DialogTitle className="font-display text-2xl italic tracking-tight text-foreground">
            {sent ? "Check your inbox" : "Sign in to continue"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {sent
              ? "We sent a secure login link to your email."
              : "We'll send you a magic link to sign in and access your document workspace."}
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label
                htmlFor="auth-email"
                className="text-sm font-medium text-foreground/80"
              >
                Email address
              </label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground/40 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                data-testid="auth-email-input"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="auth-error">
                {error}
              </p>
            )}

            <Button
              className="glow-amber w-full bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110"
              onClick={handleSendMagicLink}
              disabled={loading || !email}
              data-testid="send-magic-link-btn"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-4 text-center" data-testid="auth-confirmation">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_24px_oklch(0.78_0.12_70_/_0.12)]">
              <svg
                className="h-7 w-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We sent a login link to{" "}
              <strong className="font-semibold text-primary">{email}</strong>.
              <br />
              Click the link in your email to sign in.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

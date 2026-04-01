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

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError("Google sign in failed. Please try again.");
    }
  }

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
            <Button
              variant="outline"
              className="w-full gap-3 border-border/50 bg-secondary/30 font-medium text-foreground transition-all hover:bg-secondary/50"
              onClick={handleGoogleSignIn}
              disabled={loading}
              data-testid="google-sign-in-btn"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground/60">or</span>
              </div>
            </div>

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
              className="glow-primary w-full bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110"
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

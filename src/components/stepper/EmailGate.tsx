"use client";

import { useState } from "react";
import { Mail, BarChart3, Map, TrendingUp, Users } from "lucide-react";

interface EmailGateProps {
  onSubmit: (email: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UNLOCK_ITEMS = [
  { icon: BarChart3, text: "Detailed points breakdown" },
  { icon: Map, text: "Assessment stream & document checklist" },
  { icon: TrendingUp, text: "PR & employer sponsored visa pathways" },
] as const;

/**
 * Email gate shown after teaser screen.
 * Collects email before unlocking the full results dashboard.
 */
export function EmailGate({ onSubmit }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const isValid = EMAIL_REGEX.test(email);

  return (
    <div className="flex min-h-screen flex-col bg-background gradient-mesh px-6">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Icon with amber glow */}
          <div className="animate-reveal-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl glass-card glow-amber">
              <Mail className="h-7 w-7 text-primary" />
            </div>
          </div>

          {/* Editorial heading */}
          <div className="space-y-3 animate-reveal-up delay-100">
            <h2 className="font-display text-3xl italic text-foreground">
              Unlock Your Full Assessment Roadmap
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enter your email to access your complete skills assessment
              roadmap and document preparation tools.
            </p>
          </div>

          {/* What you unlock - glass card items */}
          <div className="space-y-2.5 text-left animate-reveal-up delay-200" data-testid="unlock-checklist">
            {UNLOCK_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-xl glass-card px-4 py-3 transition-all duration-300 hover:border-primary/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="space-y-4 animate-reveal-up delay-300">
            <div className="glass-card rounded-2xl p-1 transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_0_30px_oklch(0.78_0.12_70/0.1)]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-transparent px-5 py-4 text-center text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && isValid && onSubmit(email)}
                data-testid="email-input"
              />
            </div>
            <button
              onClick={() => onSubmit(email)}
              disabled={!isValid}
              className="w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg glow-amber transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
              data-testid="email-submit"
            >
              View My Results
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-reveal-up delay-400">
            <Users className="h-3.5 w-3.5" />
            <span data-testid="social-proof">
              Join 2,400+ others preparing their skills assessment
            </span>
          </div>

          <p className="text-xs text-muted-foreground/50 animate-reveal-up delay-500">
            We respect your privacy. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailGate;

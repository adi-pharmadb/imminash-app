"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page — chat-first rebuild.
 * Hero + single sign-in CTA. If the user is already authed, jump straight
 * to /chat; otherwise open the AuthModal (Google OAuth or email OTP).
 */
export default function HomePage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/chat");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center" data-testid="home-page">
      <div className="gradient-mesh relative w-full">
        <section
          className="relative flex flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-24 text-center sm:pt-40 sm:pb-40"
          data-testid="hero"
        >
          <div
            className="pointer-events-none absolute top-[-20%] left-[-10%] size-[600px] rounded-full opacity-30 blur-[120px]"
            style={{ background: "oklch(0.62 0.17 250 / 0.15)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[-5%] bottom-[10%] size-[400px] rounded-full opacity-20 blur-[100px]"
            style={{ background: "oklch(0.72 0.17 155 / 0.12)" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl space-y-10">
            <div className="animate-reveal-up">
              <span className="font-display text-lg italic tracking-wide text-primary/60">
                imminash
              </span>
            </div>

            <h1 className="animate-reveal-up delay-100 font-display text-5xl leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Your PR pathway,
              <br />
              <span className="italic text-primary">one conversation</span>
              <br />
              away.
            </h1>

            <p className="animate-reveal-up delay-200 mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Chat with an AI migration strategist that knows the DHA rules,
              matches your occupation, calculates your points, and drafts the
              documents you need.
            </p>

            <div className="animate-reveal-up delay-300 flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="glow-primary h-13 cursor-pointer px-8 text-base font-semibold transition-all duration-300 hover:scale-[1.02]"
                onClick={() => setAuthOpen(true)}
                disabled={checking}
                data-testid="hero-cta"
              >
                Sign in to start
                <ArrowRight className="ml-1 size-4" />
              </Button>
              <span className="text-xs text-muted-foreground/50">
                Google or email magic link. No credit card to start.
              </span>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-auto w-full border-t border-border/40 px-6 py-12" data-testid="footer">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <span className="font-display text-2xl italic tracking-tight text-foreground/80">
              imminash
            </span>
          </div>
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60" />
            <div className="size-1.5 rounded-full bg-primary/40" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60" />
          </div>
          <p className="mx-auto max-w-lg text-center text-xs leading-relaxed text-muted-foreground/70">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional advice.
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}

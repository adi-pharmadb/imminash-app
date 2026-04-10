"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, FileText, Calculator, MapPin } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

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
    <main className="relative flex min-h-screen flex-col items-center bg-background" data-testid="home-page">

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl px-6 pt-32 pb-20 sm:pt-40 lg:pb-32 overflow-hidden">

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Copy */}
          <div className="space-y-8 z-10">
            <div className="animate-reveal-up">
              <h1 className="font-display text-6xl leading-none tracking-tighter text-foreground sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem]">
                Crack the <br />
                <span className="text-primary">PR code.</span>
              </h1>
            </div>

            <p className="animate-reveal-up delay-100 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Australian PR, without the paperwork maze. Chat with an AI strategist that knows the DHA rules, calculates your points, and drafts your documents instantly.
            </p>

            <div className="animate-reveal-up delay-200 flex flex-col items-start gap-4">
              <MagneticButton
                className="h-14 px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => setAuthOpen(true)}
                disabled={checking}
                data-testid="hero-cta"
              >
                Sign in to start
                <ArrowRight className="ml-2 size-5" />
              </MagneticButton>
              <span className="text-xs text-muted-foreground/60 font-mono uppercase tracking-wider">
                Google / Email magic link. No CC required.
              </span>
            </div>
          </div>

          {/* Right: Mock Chat UI */}
          <div className="animate-reveal-up delay-300 relative z-10 w-full max-w-lg mx-auto lg:ml-auto">
            <div className="relative rounded-2xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-secondary border border-border p-4 text-sm text-foreground/80 leading-relaxed">
                    I see you have 3 years as a Software Engineer and Superior English. I&apos;ve calculated your 189 points score. You&apos;re currently sitting at <strong>90 points</strong>. Ready to draft your ACS skills assessment?
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                    <div className="size-4 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground p-4 text-sm leading-relaxed">
                    Yes, let&apos;s do it.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-secondary border border-border p-4 text-sm text-foreground/80 w-full space-y-3">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <FileText className="size-4 text-primary" /> RPL Draft Generated
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-grow-width" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Bento Grid Section — alternating dark background */}
      <section className="relative w-full bg-section-alt text-section-alt-foreground">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="animate-reveal-up delay-400 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <SpotlightCard className="md:col-span-2 group flex flex-col justify-between bg-transparent border-section-alt-foreground/10 hover:border-section-alt-foreground/20">
              <div className="mb-12">
                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Calculator className="size-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">Live Points Calculation</h3>
                <p className="text-section-alt-foreground/60 leading-relaxed max-w-md">
                  Know exactly where you stand. Our engine recalculates your 189, 190, and 491 points instantly as you adjust your profile parameters.
                </p>
              </div>
              <div className="h-32 w-full rounded-xl border border-section-alt-foreground/5 bg-gradient-to-t from-section-alt-foreground/5 to-transparent relative overflow-hidden flex items-end p-4">
                <div className="flex items-end gap-2 w-full h-full opacity-60">
                  <div className="w-1/4 bg-section-alt-foreground/20 rounded-t-sm h-[40%]" />
                  <div className="w-1/4 bg-section-alt-foreground/30 rounded-t-sm h-[60%]" />
                  <div className="w-1/4 bg-section-alt-foreground/40 rounded-t-sm h-[80%]" />
                  <div className="w-1/4 bg-primary rounded-t-sm h-[100%] relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-primary">90pt</div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* Card 2 */}
            <SpotlightCard className="md:col-span-1 group flex flex-col justify-between bg-transparent border-section-alt-foreground/10 hover:border-section-alt-foreground/20">
              <div>
                <div className="size-12 rounded-2xl bg-section-alt-foreground/5 flex items-center justify-center border border-section-alt-foreground/10 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Bot className="size-6 text-section-alt-foreground/80" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">DHA Rules, Decoded</h3>
                <p className="text-section-alt-foreground/60 leading-relaxed">
                  Trained on the latest Department of Home Affairs guidelines. Stop reading dense 100-page PDFs. Just ask.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 3 */}
            <SpotlightCard className="md:col-span-1 group flex flex-col justify-between bg-transparent border-section-alt-foreground/10 hover:border-section-alt-foreground/20">
              <div>
                <div className="size-12 rounded-2xl bg-section-alt-foreground/5 flex items-center justify-center border border-section-alt-foreground/10 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <FileText className="size-6 text-section-alt-foreground/80" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">AI-Powered Drafts</h3>
                <p className="text-section-alt-foreground/60 leading-relaxed">
                  Generate RPLs, EOIs, and work reference letters formatted perfectly for your assessing authority.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 4 */}
            <SpotlightCard className="md:col-span-2 group flex flex-col justify-between bg-transparent border-section-alt-foreground/10 hover:border-section-alt-foreground/20">
              <div className="mb-12">
                <div className="size-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <MapPin className="size-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">State Sponsorships Demystified</h3>
                <p className="text-section-alt-foreground/60 leading-relaxed max-w-md">
                  Every state has different criteria. Imminash automatically filters the noise and shows you the best states to target based on your exact occupation code and points.
                </p>
              </div>
            </SpotlightCard>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border px-6 py-12 bg-background">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <span className="font-display text-2xl tracking-tight text-foreground/90">
              imminash
            </span>
          </div>
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
            <div className="size-1.5 rounded-full bg-primary/60" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
          </div>
          <p className="mx-auto max-w-lg text-center text-xs leading-relaxed text-muted-foreground/70">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional advice.
          </p>
          <p className="mt-6 text-center text-xs font-mono uppercase text-muted-foreground/50 tracking-widest">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}

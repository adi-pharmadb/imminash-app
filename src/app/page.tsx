"use client";

/**
 * Landing page — conversion-optimized with Trust & Authority design.
 *
 * Nikita Bier growth principles:
 *  - Headline shows the OUTCOME not the tool
 *  - CTA is an action ("Check my eligibility") not a chore ("Sign in")
 *  - Social proof + specificity + urgency above fold
 *  - Comparison table converts fence-sitters (35% higher conversion)
 *  - Remove ALL friction: "Free, No CC, 2 minutes"
 *  - Page loads fast: no images, no heavy deps
 *
 * Trust & Authority design (UI/UX Pro Max skill):
 *  - Navy bg hero + gold accent CTA
 *  - EB Garamond serif headings for legal authority
 *  - Lato body for clean readability
 *  - Trust signals: metric counters, check badges, comparison proof
 *  - Subtle glow on CTA, stat-reveal on scroll
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Minus, Shield, X, Zap } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const STEPS = [
  {
    num: "01",
    title: "Answer 7 quick questions",
    detail: "Age, visa, education, experience, English, job title, duties. Takes about 2 minutes.",
  },
  {
    num: "02",
    title: "See your score instantly",
    detail: "Points breakdown, ANZSCO occupation match, and which visa pathways are open to you.",
  },
  {
    num: "03",
    title: "Get your application pack",
    detail: "Employment reference letters drafted to ACS standards, submission guide, and document checklist.",
  },
];

const COMPARE_ROWS: Array<{
  feature: string;
  diy: "yes" | "no" | "partial";
  mara: "yes" | "no" | "partial";
  imminash: "yes" | "no" | "partial";
}> = [
  { feature: "Points calculation", diy: "partial", mara: "yes", imminash: "yes" },
  { feature: "ANZSCO occupation matching", diy: "no", mara: "yes", imminash: "yes" },
  { feature: "Employment reference drafts", diy: "no", mara: "yes", imminash: "yes" },
  { feature: "ACS submission guide", diy: "no", mara: "yes", imminash: "yes" },
  { feature: "Available 24/7", diy: "yes", mara: "no", imminash: "yes" },
  { feature: "Results in minutes", diy: "no", mara: "no", imminash: "yes" },
];

function CellIcon({ state }: { state: "yes" | "no" | "partial" }) {
  if (state === "yes")
    return <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />;
  if (state === "partial")
    return <Minus className="h-4 w-4 text-muted-foreground/50" />;
  return <X className="h-4 w-4 text-muted-foreground/30" />;
}

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

  const openAuth = () => setAuthOpen(true);

  return (
    <main
      className="relative flex min-h-screen flex-col bg-background text-foreground"
      data-testid="home-page"
    >
      {/* ════════════════════════════════════════════════════════
          NAVBAR — minimal: brand left, theme toggle + CTA right
         ════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="font-serif-premium text-lg font-medium tracking-tight text-foreground select-none">
            imminash
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle inline />
            <button
              onClick={openAuth}
              disabled={checking}
              className="hidden cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 sm:inline-flex"
            >
              Get started
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          [1] HERO — navy bg, gold CTA, authority serif headline
         ════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-section-alt text-section-alt-foreground">
        {/* Subtle gradient accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-10 blur-[100px]"
          style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full opacity-8 blur-[120px]"
          style={{ background: "var(--primary)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="animate-reveal-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-section-alt-foreground/10 bg-section-alt-foreground/5 px-3 py-1 text-xs font-medium text-section-alt-foreground/80 backdrop-blur-sm">
                <Zap className="h-3 w-3" />
                Free eligibility check
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-reveal-up delay-100 mt-8 font-serif-premium text-4xl font-medium leading-[1.08] tracking-tight text-section-alt-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Find out if you
              <br className="hidden sm:block" />
              qualify for
              <span className="relative ml-3 inline-block">
                <span className="relative z-10">Australian PR</span>
                <span
                  aria-hidden
                  className="absolute bottom-[0.1em] left-0 right-0 h-[0.12em] rounded-full opacity-60"
                  style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
                />
              </span>
            </h1>

            {/* Subheading */}
            <p className="animate-reveal-up delay-200 mx-auto mt-6 max-w-xl font-premium-body text-base leading-relaxed text-section-alt-foreground/65 sm:text-lg">
              Answer 7 questions. Get your points score, best occupation match,
              and visa pathway in under 3 minutes. Completely free.
            </p>

            {/* CTA */}
            <div className="animate-reveal-up delay-300 mt-10">
              <button
                onClick={openAuth}
                disabled={checking}
                className="group relative inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full px-9 text-base font-semibold tracking-wide text-section-alt transition-all duration-300 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--gold, oklch(0.53 0.14 55))",
                  boxShadow:
                    "0 0 30px color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 40%, transparent), 0 4px 12px rgba(0,0,0,0.3)",
                }}
                data-testid="hero-cta"
              >
                Check my eligibility
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Trust bar */}
            <div className="animate-reveal-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-premium-body text-xs text-section-alt-foreground/50">
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                2-minute assessment
              </span>
            </div>
          </div>

          {/* Stat counters */}
          <div className="animate-reveal-up delay-500 mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-section-alt-foreground/10 pt-10">
            <StatCounter value="189" label="Visa pathway" />
            <StatCounter value="65+" label="Min points threshold" />
            <StatCounter value="3 min" label="To get your score" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [2] HOW IT WORKS — 3 steps with visual numbering
         ════════════════════════════════════════════════════════ */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 font-serif-premium text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Three steps to your PR pathway
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="group relative rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <span className="font-serif-premium text-5xl font-medium leading-none text-primary/15 transition-colors group-hover:text-primary/25">
                {s.num}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 font-premium-body text-sm leading-relaxed text-muted-foreground">
                {s.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Inline CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={openAuth}
            disabled={checking}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold tracking-wide text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50"
          >
            Start my free assessment
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [3] COMPARISON — Imminash vs MARA vs DIY
         ════════════════════════════════════════════════════════ */}
      <section className="w-full bg-section-alt text-section-alt-foreground">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Compare
            </span>
            <h2 className="mt-3 font-serif-premium text-3xl font-medium tracking-tight text-section-alt-foreground sm:text-4xl">
              Same output. Fraction of the cost.
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-premium-body text-sm text-section-alt-foreground/55">
              Most MARA agents charge $2,000+. DIY means weeks of guesswork and
              risking rejection. We give you the same deliverables in minutes.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-xl border border-section-alt-foreground/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-section-alt-foreground/40">
                    &nbsp;
                  </th>
                  <th className="p-4 text-center">
                    <span className="block text-sm font-medium text-section-alt-foreground/70">
                      DIY
                    </span>
                    <span className="block font-premium-body text-[11px] text-section-alt-foreground/40">
                      Free but risky
                    </span>
                  </th>
                  <th className="p-4 text-center">
                    <span className="block text-sm font-medium text-section-alt-foreground/70">
                      MARA Agent
                    </span>
                    <span className="block font-premium-body text-[11px] text-section-alt-foreground/40">
                      $2,000 - $5,000
                    </span>
                  </th>
                  <th className="relative p-4 text-center">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                      style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
                    />
                    <span className="block text-sm font-semibold text-primary">
                      Imminash
                    </span>
                    <span
                      className="block font-premium-body text-[11px] font-semibold"
                      style={{ color: "var(--gold, oklch(0.53 0.14 55))" }}
                    >
                      $200
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i < COMPARE_ROWS.length - 1
                        ? "border-t border-section-alt-foreground/5"
                        : "border-t border-section-alt-foreground/5"
                    }
                  >
                    <td className="p-4 font-premium-body text-section-alt-foreground/75">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center">
                        <CellIcon state={row.diy} />
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center">
                        <CellIcon state={row.mara} />
                      </span>
                    </td>
                    <td className="p-4 text-center bg-primary/[0.03]">
                      <span className="inline-flex items-center justify-center">
                        <CellIcon state={row.imminash} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [4] TRUST + FINAL CTA
         ════════════════════════════════════════════════════════ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28 text-center">
        {/* Trust badges */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-6 font-premium-body text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            DHA rules database
          </span>
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            ACS criteria aligned
          </span>
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Data never shared
          </span>
        </div>

        <h2 className="font-serif-premium text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Your PR pathway starts here
        </h2>
        <p className="mx-auto mt-4 max-w-md font-premium-body text-base leading-relaxed text-muted-foreground">
          Join skilled workers worldwide who used Imminash to assess their
          eligibility and prepare their applications.
        </p>

        <div className="mt-10">
          <button
            onClick={openAuth}
            disabled={checking}
            className="group relative inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full px-9 text-base font-semibold tracking-wide text-section-alt transition-all duration-300 hover:-translate-y-[1px] disabled:opacity-50"
            style={{
              background: "var(--gold, oklch(0.53 0.14 55))",
              boxShadow:
                "0 0 30px color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 30%, transparent), 0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            Check my eligibility
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
        <p className="mt-4 font-premium-body text-xs text-muted-foreground/50">
          Free to start. Pay only when you need documents.
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════
          [5] FOOTER
         ════════════════════════════════════════════════════════ */}
      <footer className="w-full border-t border-border px-6 py-10 bg-background">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-serif-premium text-lg font-medium tracking-tight text-foreground/90">
            imminash
          </span>
          <p className="mx-auto mt-4 max-w-lg font-premium-body text-xs leading-relaxed text-muted-foreground/60">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional advice.
          </p>
          <p className="mt-4 font-premium-body text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}

function StatCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <span className="font-serif-premium text-3xl font-medium text-section-alt-foreground sm:text-4xl">
        {value}
      </span>
      <span className="mt-1 block font-premium-body text-xs text-section-alt-foreground/50">
        {label}
      </span>
    </div>
  );
}

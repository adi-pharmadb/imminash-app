"use client";

/**
 * Landing page — conversion-optimized, lightweight, Nikita Bier school.
 *
 * Structure:
 *  [1] Hero: clear value prop + specific CTA + trust bar + live stat
 *  [2] How it works: 3 steps, one line each
 *  [3] Comparison: Imminash vs MARA agent vs DIY
 *  [4] Final CTA repeat
 *  [5] Footer (minimal, disclaimer)
 *
 * No images. No heavy animations. < 500KB target. One conversion goal:
 * get the user to click "Check my eligibility" → auth modal → /chat.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const STEPS = [
  {
    num: "1",
    title: "Answer 7 questions",
    detail: "Age, visa, education, experience, English, job title, duties.",
  },
  {
    num: "2",
    title: "See your score instantly",
    detail: "Points breakdown, ANZSCO occupation match, visa pathway.",
  },
  {
    num: "3",
    title: "Get your document pack",
    detail: "Employment reference letters, submission guide, checklist.",
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
  { feature: "Typical cost", diy: "partial", mara: "no", imminash: "yes" },
];

const COMPARE_LABELS = {
  diy: { label: "DIY", sublabel: "Free but risky" },
  mara: { label: "MARA Agent", sublabel: "$2,000 - $5,000" },
  imminash: { label: "Imminash", sublabel: "$200" },
};

function CellIcon({ state }: { state: "yes" | "no" | "partial" }) {
  if (state === "yes")
    return <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />;
  if (state === "partial")
    return <Minus className="h-4 w-4 text-muted-foreground/60" />;
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
          [1] HERO — above-fold, everything that matters
         ════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto w-full max-w-3xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 text-center">
        <div className="animate-reveal-up">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Free eligibility check
          </span>
        </div>

        <h1 className="animate-reveal-up delay-100 mt-6 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Find out if you qualify
          <br />
          for Australian PR
        </h1>

        <p className="animate-reveal-up delay-200 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Answer 7 questions. Get your points score, best occupation match, and
          visa pathway in under 3 minutes. Free.
        </p>

        <div className="animate-reveal-up delay-300 mt-8">
          <button
            onClick={openAuth}
            disabled={checking}
            className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="hero-cta"
          >
            Check my eligibility
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Trust bar */}
        <div className="animate-reveal-up delay-400 mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            Free to start
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            No credit card
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            2-minute assessment
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [2] HOW IT WORKS — 3 steps, horizontal on desktop
         ════════════════════════════════════════════════════════ */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20">
        <div className="animate-reveal-up delay-500 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="text-center sm:text-left">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {s.num}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [3] COMPARISON TABLE — Imminash vs MARA vs DIY
         ════════════════════════════════════════════════════════ */}
      <section className="w-full bg-section-alt text-section-alt-foreground">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-medium tracking-tight text-section-alt-foreground sm:text-3xl">
              How does Imminash compare?
            </h2>
            <p className="mt-3 text-sm text-section-alt-foreground/60">
              Most MARA agents charge $2,000 - $5,000. DIY means weeks of
              guesswork. We give you the same output in minutes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-section-alt-foreground/10">
                  <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-section-alt-foreground/50">
                    Feature
                  </th>
                  {(["diy", "mara", "imminash"] as const).map((key) => (
                    <th
                      key={key}
                      className={`px-3 py-3 text-center ${
                        key === "imminash"
                          ? "rounded-t-lg bg-primary/10"
                          : ""
                      }`}
                    >
                      <span
                        className={`block text-sm font-semibold ${
                          key === "imminash"
                            ? "text-primary"
                            : "text-section-alt-foreground"
                        }`}
                      >
                        {COMPARE_LABELS[key].label}
                      </span>
                      <span className="block text-[11px] text-section-alt-foreground/50">
                        {COMPARE_LABELS[key].sublabel}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i < COMPARE_ROWS.length - 1
                        ? "border-b border-section-alt-foreground/5"
                        : ""
                    }
                  >
                    <td className="py-3 pr-4 text-section-alt-foreground/80">
                      {row.feature}
                    </td>
                    {(["diy", "mara", "imminash"] as const).map((key) => (
                      <td
                        key={key}
                        className={`px-3 py-3 text-center ${
                          key === "imminash" ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="inline-flex items-center justify-center">
                          <CellIcon state={row[key]} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={openAuth}
              disabled={checking}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50"
            >
              Check my eligibility
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs text-section-alt-foreground/50">
              Free to start. Pay only when you need documents.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [4] FINAL CTA — simple repeat
         ════════════════════════════════════════════════════════ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Ready to find your pathway?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          127+ assessments completed. Join Australians and skilled workers
          worldwide who used Imminash to map their PR journey.
        </p>
        <div className="mt-8">
          <button
            onClick={openAuth}
            disabled={checking}
            className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50"
          >
            Check my eligibility
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          [5] FOOTER — minimal, disclaimer
         ════════════════════════════════════════════════════════ */}
      <footer className="w-full border-t border-border px-6 py-10 bg-background">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-display text-lg tracking-tight text-foreground/90">
            imminash
          </span>
          <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-muted-foreground/60">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional advice.
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <ThemeToggle />
    </main>
  );
}

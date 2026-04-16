"use client";

/**
 * Landing page — Trust & Authority + Hero-Centric design.
 *
 * Design system: design-system/imminash-landing/
 * Style: Trust & Authority (UI/UX Pro Max)
 * Pattern: Hero-Centric + Bento Grid + Comparison
 * Colors: Navy primary, gold CTA, dark hero bg
 * Typography: EB Garamond (heading), Lato (body)
 * Effects: CTA glow, card hover lift, stat reveal, badge pulse
 *
 * Pre-delivery checklist:
 *  [x] No emojis as icons (Lucide SVG only)
 *  [x] cursor-pointer on all clickable elements
 *  [x] Hover transitions 150-300ms
 *  [x] Focus states visible
 *  [x] prefers-reduced-motion respected
 *  [x] Responsive 375/768/1024/1440
 *  [x] Floating navbar with spacing
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Globe,
  Minus,
  Scale,
  Shield,
  Target,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Auth modal is heavy (@base-ui/react/dialog) and only needed on click.
// Dynamic import keeps it out of the initial landing bundle.
const AuthModal = dynamic(
  () => import("@/components/auth/AuthModal").then((m) => m.AuthModal),
  { ssr: false },
);

const COMPARE_ROWS: Array<[string, "yes" | "no" | "partial", "yes" | "no" | "partial", "yes" | "no" | "partial"]> = [
  ["Points calculation", "partial", "yes", "yes"],
  ["ANZSCO occupation matching", "no", "yes", "yes"],
  ["Employment reference drafts", "no", "yes", "yes"],
  ["ACS submission guide", "no", "yes", "yes"],
  ["Available 24/7", "yes", "no", "yes"],
  ["Results in minutes", "no", "no", "yes"],
];

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
  // Preload auth modal when user hovers any CTA (intent signal).
  const preloadAuth = () => {
    void import("@/components/auth/AuthModal");
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground" data-testid="home-page">

      {/* ═══════ FLOATING NAVBAR ═══════ */}
      <nav className="fixed top-0 inset-x-0 z-40">
        <div className="mx-auto mt-4 flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-border/30 bg-background/70 px-5 backdrop-blur-xl mx-4 sm:mx-6 lg:mx-auto">
          <span className="font-serif-premium text-lg font-medium tracking-tight text-foreground select-none">
            imminash
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle inline />
            <button
              onClick={openAuth}
              disabled={checking}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 disabled:opacity-50 sm:px-4"
            >
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO — full viewport, dramatic ═══════ */}
      <section
        className="relative flex items-center justify-center overflow-hidden bg-section-alt text-section-alt-foreground"
        style={{ minHeight: "100dvh" }}
      >
        {/* Ambient glow orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[10%] right-[5%] h-[600px] w-[600px] rounded-full opacity-[0.07] blur-[120px]"
          style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[5%] left-[-5%] h-[500px] w-[500px] rounded-full opacity-[0.05] blur-[100px]"
          style={{ background: "var(--primary)" }}
        />
        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--section-alt-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--section-alt-foreground) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-6 pt-28 pb-20 text-center">
          {/* Eyebrow */}
          <div className="animate-reveal-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-section-alt-foreground/10 bg-section-alt-foreground/[0.04] px-4 py-1.5 text-xs font-medium text-section-alt-foreground/70 backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
              />
              Free eligibility check
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-reveal-up delay-100 mt-8 font-serif-premium text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[1.05] tracking-tight text-section-alt-foreground">
            Find out if you qualify
            <br />
            for{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Australian PR</span>
              <span
                aria-hidden
                className="absolute bottom-[0.08em] left-0 right-0 h-[0.14em] rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--gold, oklch(0.53 0.14 55)), transparent)",
                  opacity: 0.6,
                }}
              />
            </span>
          </h1>

          {/* Sub */}
          <p className="animate-reveal-up delay-200 mx-auto mt-7 max-w-xl font-premium-body text-base leading-relaxed text-section-alt-foreground/55 sm:text-lg">
            Answer 7 questions. Get your points score, best occupation match,
            and visa pathway in under 3 minutes. Completely free.
          </p>

          {/* CTA */}
          <div className="animate-reveal-up delay-300 mt-10">
            <button
              onClick={openAuth}
              onMouseEnter={preloadAuth}
              onFocus={preloadAuth}
              disabled={checking}
              className="group relative inline-flex h-[56px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-10 text-base font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "var(--gold, oklch(0.53 0.14 55))",
                color: "#0a0b0d",
                boxShadow:
                  "0 0 40px color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 35%, transparent), 0 4px 16px rgba(0,0,0,0.3)",
              }}
              data-testid="hero-cta"
            >
              Check my eligibility
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Trust bar */}
          <div className="animate-reveal-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-premium-body text-xs text-section-alt-foreground/40">
            {["Free to start", "No credit card", "2-minute assessment"].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  {t}
                </span>
              ),
            )}
          </div>

          {/* Hero stat counters */}
          <div className="animate-reveal-up delay-500 mx-auto mt-20 grid max-w-md grid-cols-3 border-t border-section-alt-foreground/[0.06] pt-10">
            <HeroStat value="189" label="Visa pathway" />
            <HeroStat value="65+" label="Points threshold" />
            <HeroStat value="<3 min" label="To get your score" />
          </div>
        </div>

        {/* Scroll indicator (hidden on mobile for space) */}
        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-bounce sm:block">
          <div className="h-8 w-5 rounded-full border-2 border-section-alt-foreground/20 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-section-alt-foreground/30" />
          </div>
        </div>
      </section>

      {/* ═══════ BENTO GRID — features as visual cards ═══════ */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 font-serif-premium text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Three steps to your PR pathway
          </h2>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          <BentoCard
            num="01"
            icon={<Target className="h-5 w-5" />}
            title="Answer 7 quick questions"
            detail="Age, visa, education, experience, English, job title, duties. Our AI asks the right questions to build your profile."
            accent={false}
          />
          <BentoCard
            num="02"
            icon={<Zap className="h-5 w-5" />}
            title="See your score instantly"
            detail="Points breakdown, ANZSCO occupation match, and which visa pathways (189, 190, 491) are open to you."
            accent={false}
          />
          <BentoCard
            num="03"
            icon={<FileText className="h-5 w-5" />}
            title="Get your application pack"
            detail="Employment reference letters drafted to ACS standards, submission guide, and document checklist. Download as PDF."
            accent
          />
        </div>

        <div className="mt-14 text-center">
          <button
            onClick={openAuth}
            disabled={checking}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold tracking-wide text-primary-foreground shadow-md shadow-primary/15 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 disabled:opacity-50"
          >
            Start my free assessment
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ═══════ COMPARISON TABLE ═══════ */}
      <section className="w-full bg-section-alt text-section-alt-foreground">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Compare
            </span>
            <h2 className="mt-3 font-serif-premium text-3xl font-medium tracking-tight text-section-alt-foreground sm:text-4xl">
              Same output. Fraction of the cost.
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-premium-body text-sm leading-relaxed text-section-alt-foreground/50">
              Most MARA agents charge $2,000+. DIY means weeks of guesswork and
              risking rejection. We give you the same deliverables in minutes.
            </p>
          </div>

          {/* Desktop table */}
          <div className="mt-14 hidden overflow-hidden rounded-2xl border border-section-alt-foreground/[0.06] sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-section-alt-foreground/[0.06]">
                  <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-section-alt-foreground/35" />
                  <ColHeader label="DIY" sub="Free but risky" />
                  <ColHeader label="MARA Agent" sub="$2,000 - $5,000" />
                  <th className="relative p-4 text-center">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
                    />
                    <span className="block text-sm font-semibold text-primary">
                      Imminash
                    </span>
                    <span
                      className="block font-premium-body text-[11px] font-semibold"
                      style={{ color: "var(--gold, oklch(0.53 0.14 55))" }}
                    >
                      From $200
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([feature, diy, mara, imminash]) => (
                  <tr
                    key={feature}
                    className="border-t border-section-alt-foreground/[0.04]"
                  >
                    <td className="p-4 font-premium-body text-section-alt-foreground/70">
                      {feature}
                    </td>
                    <td className="p-4 text-center">
                      <CellIcon state={diy as "yes" | "no" | "partial"} />
                    </td>
                    <td className="p-4 text-center">
                      <CellIcon state={mara as "yes" | "no" | "partial"} />
                    </td>
                    <td
                      className="p-4 text-center"
                      style={{
                        background:
                          "color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 4%, transparent)",
                      }}
                    >
                      <CellIcon state={imminash as "yes" | "no" | "partial"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="mt-10 grid gap-4 sm:hidden">
            <CompareCard
              label="DIY"
              sub="Free but risky"
              rows={COMPARE_ROWS.map(([f, s]) => [f, s as string])}
              idx={1}
            />
            <CompareCard
              label="MARA Agent"
              sub="$2,000 – $5,000"
              rows={COMPARE_ROWS.map(([f, , s]) => [f, s as string])}
              idx={2}
            />
            <CompareCard
              label="Imminash"
              sub="From $200"
              rows={COMPARE_ROWS.map(([f, , , s]) => [f, s as string])}
              idx={3}
              highlight
            />
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={openAuth}
              disabled={checking}
              className="group relative inline-flex h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-8 text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: "var(--gold, oklch(0.53 0.14 55))",
                color: "#0a0b0d",
                boxShadow:
                  "0 0 30px color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 25%, transparent), 0 4px 12px rgba(0,0,0,0.25)",
              }}
            >
              Check my eligibility
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <p className="mt-4 font-premium-body text-xs text-section-alt-foreground/40">
              Free to start. Pay only when you need documents.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ TRUST STRIP + FINAL CTA ═══════ */}
      <section className="mx-auto w-full max-w-4xl px-6 py-24 sm:py-32 text-center">
        {/* Trust row */}
        <div className="mb-14 flex flex-wrap items-center justify-center gap-8">
          <TrustBadge icon={<Scale className="h-5 w-5" />} label="DHA rules database" />
          <TrustBadge icon={<Shield className="h-5 w-5" />} label="ACS criteria aligned" />
          <TrustBadge icon={<Globe className="h-5 w-5" />} label="Data never shared" />
          <TrustBadge icon={<Timer className="h-5 w-5" />} label="Results in minutes" />
        </div>

        <h2 className="font-serif-premium text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          Your PR pathway starts here
        </h2>
        <p className="mx-auto mt-5 max-w-md font-premium-body text-base leading-relaxed text-muted-foreground">
          Join skilled workers worldwide who used Imminash to assess their
          eligibility and prepare their applications.
        </p>
        <div className="mt-10">
          <button
            onClick={openAuth}
            disabled={checking}
            className="group relative inline-flex h-[56px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-10 text-base font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "var(--gold, oklch(0.53 0.14 55))",
              color: "#0a0b0d",
              boxShadow:
                "0 0 40px color-mix(in oklch, var(--gold, oklch(0.53 0.14 55)) 30%, transparent), 0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            Check my eligibility
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="w-full border-t border-border/60 bg-background px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-serif-premium text-lg font-medium tracking-tight text-foreground/80">
            imminash
          </span>
          <p className="mx-auto mt-4 max-w-lg font-premium-body text-xs leading-relaxed text-muted-foreground/50">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional
            advice.
          </p>
          <p className="mt-4 font-premium-body text-[11px] text-muted-foreground/35">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}

/* ════════════════════════════════════════════════════════════
   Sub-components (co-located, not worth separate files)
   ════════════════════════════════════════════════════════════ */

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <span className="font-serif-premium text-2xl font-medium text-section-alt-foreground sm:text-3xl">
        {value}
      </span>
      <span className="mt-1 block font-premium-body text-[11px] text-section-alt-foreground/40">
        {label}
      </span>
    </div>
  );
}

function BentoCard({
  num,
  icon,
  title,
  detail,
  accent,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative cursor-default overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        accent
          ? "border-primary/20 bg-primary/[0.03] hover:border-primary/40 hover:shadow-primary/10"
          : "border-border bg-card hover:border-primary/20 hover:shadow-lg"
      }`}
    >
      <span className="pointer-events-none absolute right-5 top-4 font-serif-premium text-6xl font-medium leading-none text-foreground/[0.04] transition-colors group-hover:text-primary/[0.08]">
        {num}
      </span>
      <div
        className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200 ${
          accent
            ? "bg-primary/10 text-primary group-hover:bg-primary/15"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 font-premium-body text-sm leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function ColHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <th className="p-4 text-center">
      <span className="block text-sm font-medium text-section-alt-foreground/65">
        {label}
      </span>
      <span className="block font-premium-body text-[11px] text-section-alt-foreground/35">
        {sub}
      </span>
    </th>
  );
}

function CellIcon({ state }: { state: "yes" | "no" | "partial" }) {
  if (state === "yes")
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
      </span>
    );
  if (state === "partial")
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="h-4 w-4 text-section-alt-foreground/30" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center">
      <X className="h-4 w-4 text-section-alt-foreground/15" />
    </span>
  );
}

function TrustBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 font-premium-body text-sm text-muted-foreground">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-primary transition-colors hover:border-primary/30">
        {icon}
      </span>
      {label}
    </div>
  );
}

function CompareCard({
  label,
  sub,
  rows,
  idx,
  highlight,
}: {
  label: string;
  sub: string;
  rows: Array<[string, string]>;
  idx: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 ${
        highlight
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-section-alt-foreground/[0.08] bg-section-alt-foreground/[0.02]"
      }`}
    >
      {highlight && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "var(--gold, oklch(0.53 0.14 55))" }}
        />
      )}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span
            className={`font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] ${
              highlight ? "text-primary" : "text-section-alt-foreground/40"
            }`}
          >
            Option {idx}
          </span>
          <p
            className={`mt-0.5 text-lg font-semibold ${
              highlight ? "text-primary" : "text-section-alt-foreground"
            }`}
          >
            {label}
          </p>
        </div>
        <span
          className="font-premium-body text-xs font-semibold"
          style={{
            color: highlight
              ? "var(--gold, oklch(0.53 0.14 55))"
              : undefined,
          }}
        >
          <span
            className={highlight ? "" : "text-section-alt-foreground/45"}
          >
            {sub}
          </span>
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map(([feature, state]) => (
          <li
            key={feature}
            className="flex items-center justify-between font-premium-body text-sm"
          >
            <span className="text-section-alt-foreground/75">{feature}</span>
            <CellIcon state={state as "yes" | "no" | "partial"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

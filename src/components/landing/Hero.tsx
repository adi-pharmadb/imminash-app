import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-24 text-center sm:pt-40 sm:pb-32"
      data-testid="hero"
    >
      {/* Decorative gradient orbs */}
      <div
        className="pointer-events-none absolute top-[-20%] left-[-10%] size-[600px] rounded-full opacity-30 blur-[120px]"
        style={{ background: "oklch(0.78 0.12 70 / 0.15)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-5%] bottom-[10%] size-[400px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "oklch(0.72 0.17 155 / 0.12)" }}
        aria-hidden="true"
      />

      {/* Subtle decorative line - positioned below the headline area */}
      <div
        className="pointer-events-none absolute bottom-[30%] left-0 h-px w-full opacity-[0.06]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.12 70), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl space-y-10">
        {/* Brand wordmark */}
        <div className="animate-reveal-up">
          <span className="font-display text-lg italic tracking-wide text-primary/60">
            imminash
          </span>
        </div>

        {/* Main headline */}
        <h1 className="animate-reveal-up delay-100 font-display text-5xl leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Find out if you
          <br />
          <span className="italic text-primary">qualify for PR</span>
          <br />
          in 2 minutes.
        </h1>

        {/* Subheading */}
        <p className="animate-reveal-up delay-200 mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Answer a few questions about your background. We will match you to
          the right occupation, calculate your points, and show you exactly
          which visa gets you there.
        </p>

        {/* CTA */}
        <div className="animate-reveal-up delay-300 flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="glow-amber h-13 cursor-pointer px-8 text-base font-semibold transition-all duration-300 hover:scale-[1.02]"
            nativeButton={false}
            render={<Link href="/assessment" />}
            data-testid="hero-cta"
          >
            Start Free Assessment
            <ArrowRight className="ml-1 size-4 transition-transform group-hover/button:translate-x-0.5" />
          </Button>
          <span className="text-xs text-muted-foreground/50">
            Takes 2 minutes. No sign-up needed.
          </span>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

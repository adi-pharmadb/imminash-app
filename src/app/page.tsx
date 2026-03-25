import { Hero } from "@/components/landing/Hero";
import { TrustSignals } from "@/components/landing/TrustSignals";
import { FeatureCards } from "@/components/landing/FeatureCards";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center" data-testid="home-page">
      {/* Hero with gradient mesh atmosphere */}
      <div className="gradient-mesh relative w-full">
        <Hero />
      </div>

      {/* Trust signals band */}
      <TrustSignals />

      {/* Feature cards section */}
      <section className="relative w-full px-6 py-24">
        <div className="animate-reveal-up delay-300 mx-auto mb-4 max-w-xl text-center">
          <p className="font-display text-sm italic tracking-wide text-primary/70">
            How it works
          </p>
        </div>
        <div className="animate-reveal-up delay-400 mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            Intelligence at every step
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            From occupation matching to document preparation, every stage is
            powered by data from the Department of Home Affairs.
          </p>
        </div>
        <FeatureCards />
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-border/40 px-6 py-12" data-testid="footer">
        <div className="mx-auto max-w-4xl">
          {/* Brand */}
          <div className="mb-8 text-center">
            <span className="font-display text-2xl italic tracking-tight text-foreground/80">
              imminash
            </span>
          </div>

          {/* Divider line with amber dot */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60" />
            <div className="size-1.5 rounded-full bg-primary/40" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60" />
          </div>

          {/* Disclaimer */}
          <p className="mx-auto max-w-lg text-center text-xs leading-relaxed text-muted-foreground/70">
            This tool helps you identify the best occupation match and estimate
            your eligibility. It does not guarantee assessment outcomes. Always
            consult a registered migration agent for professional advice.
          </p>

          {/* Copyright */}
          <p className="mt-6 text-center text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

import { Database, Sparkles, Users, ShieldCheck } from "lucide-react";

const signals = [
  {
    icon: Database,
    label: "Real DHA Data",
  },
  {
    icon: Sparkles,
    label: "AI Occupation Matching",
  },
  {
    icon: Users,
    label: "2,400+ Assessments Run",
  },
  {
    icon: ShieldCheck,
    label: "Points Tested & Verified",
  },
] as const;

export function TrustSignals() {
  return (
    <div className="w-full px-6 py-12" data-testid="trust-signals">
      <div className="mx-auto max-w-4xl">
        {/* Top decorative line */}
        <div className="mb-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>

        {/* Signals row */}
        <div className="animate-reveal-up delay-200 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {signals.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-3 text-center"
              data-testid="trust-signal-item"
            >
              <div className="flex size-10 items-center justify-center rounded-full border border-primary/10 bg-primary/5 transition-colors group-hover:border-primary/20 group-hover:bg-primary/10">
                <Icon className="size-4 text-primary/70" />
              </div>
              <span className="text-xs font-medium tracking-wide text-muted-foreground/80 uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom decorative line */}
        <div className="mt-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>
      </div>
    </div>
  );
}

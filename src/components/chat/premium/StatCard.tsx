"use client";

/**
 * StatCard — premium tier KPI card.
 *
 * Three variants:
 *  - "points":   big numeric value + threshold bar (min | current | target)
 *  - "strength": qualitative pill (Strong / Moderate / Developing) + caption
 *  - "count":    fraction style X / Y with a fill bar
 *
 * All variants share the Trust & Authority frame (serif headline, navy
 * left-border accent, gold when highlighted, subtle stat-reveal on mount).
 */

import { cn } from "@/lib/utils";

type Strength = "Strong" | "Moderate" | "Developing";

type BaseProps = {
  label: string;
  className?: string;
  highlight?: boolean; // gold accent when true
  delay?: number; // ms for stagger
};

type PointsProps = BaseProps & {
  variant: "points";
  value: number;
  target?: number;
  min?: number;
};

type StrengthProps = BaseProps & {
  variant: "strength";
  strength: Strength;
  caption?: string;
};

type CountProps = BaseProps & {
  variant: "count";
  value: number;
  /** Optional denominator. If omitted, renders just the value (no fraction, no progress bar). */
  total?: number;
  unit?: string;
  caption?: string;
};

export type StatCardProps = PointsProps | StrengthProps | CountProps;

const STRENGTH_META: Record<
  Strength,
  { label: string; tone: "gold" | "navy" | "muted" }
> = {
  Strong: { label: "Strong", tone: "gold" },
  Moderate: { label: "Moderate", tone: "navy" },
  Developing: { label: "Developing", tone: "muted" },
};

function Frame({
  label,
  highlight,
  delay,
  className,
  children,
}: {
  label: string;
  highlight?: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "premium-stat-reveal relative flex flex-col rounded-[var(--radius-premium)] border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        highlight ? "border-gold/40" : "border-border",
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-r",
          highlight ? "bg-gold" : "bg-primary",
        )}
      />
      <span className="mb-2 pl-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="pl-3">{children}</div>
    </div>
  );
}

export function StatCard(props: StatCardProps) {
  if (props.variant === "points") {
    const { value, target = 90, min = 65, highlight, label, delay, className } = props;
    const span = Math.max(target, value, min) + 10;
    const pct = (v: number) => `${(Math.min(v, span) / span) * 100}%`;
    return (
      <Frame
        label={label}
        highlight={highlight}
        delay={delay}
        className={className}
      >
        <div className="flex items-baseline gap-1">
          <span className="font-serif-premium text-4xl font-medium leading-none text-foreground">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
        <div
          className="relative mt-3 h-1.5 rounded-full bg-muted"
          aria-label={`Points ${value} of ${target}, minimum ${min}`}
        >
          <span
            className="absolute left-0 top-0 h-1.5 rounded-full bg-primary"
            style={{ width: pct(value) }}
          />
          <span
            aria-hidden
            className="absolute top-[-2px] h-[9px] w-px bg-muted-foreground/60"
            style={{ left: pct(min) }}
            title="Minimum"
          />
          <span
            aria-hidden
            className="absolute top-[-3px] h-[11px] w-[2px] rounded-full bg-gold"
            style={{ left: pct(target) }}
            title="Target"
          />
        </div>
        <div className="mt-1.5 flex justify-between font-premium-body text-[10px] text-muted-foreground/80">
          <span>min {min}</span>
          <span>target {target}</span>
        </div>
      </Frame>
    );
  }

  if (props.variant === "strength") {
    const { strength, caption, highlight, label, delay, className } = props;
    const meta = STRENGTH_META[strength];
    const pillTone =
      meta.tone === "gold"
        ? "bg-gold-soft text-gold border border-gold/40"
        : meta.tone === "navy"
          ? "bg-primary/10 text-primary border border-primary/30"
          : "bg-muted text-muted-foreground border border-border";
    return (
      <Frame
        label={label}
        highlight={highlight ?? meta.tone === "gold"}
        delay={delay}
        className={className}
      >
        <div
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold",
            pillTone,
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              meta.tone === "gold"
                ? "bg-gold"
                : meta.tone === "navy"
                  ? "bg-primary"
                  : "bg-muted-foreground/60",
            )}
          />
          {meta.label}
        </div>
        {caption && (
          <p className="mt-2 font-premium-body text-[11px] leading-relaxed text-muted-foreground">
            {caption}
          </p>
        )}
      </Frame>
    );
  }

  // count variant
  const { value, total, unit, caption, highlight, label, delay, className } = props;
  const showFraction = typeof total === "number" && total > 0;
  const pct = showFraction ? Math.min(1, value / total) * 100 : 0;
  return (
    <Frame
      label={label}
      highlight={highlight}
      delay={delay}
      className={className}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif-premium text-4xl font-medium leading-none text-foreground">
          {value}
        </span>
        {showFraction ? (
          <span className="font-serif-premium text-xl leading-none text-muted-foreground">
            / {total}
          </span>
        ) : unit ? (
          <span className="text-xs text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {showFraction && (
        <div className="mt-3 h-1.5 rounded-full bg-muted" aria-hidden>
          <span
            className={cn(
              "block h-1.5 rounded-full transition-[width] duration-500",
              highlight ? "bg-gold" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {caption && (
        <p className="mt-1.5 font-premium-body text-[11px] text-muted-foreground/80">
          {caption}
        </p>
      )}
    </Frame>
  );
}

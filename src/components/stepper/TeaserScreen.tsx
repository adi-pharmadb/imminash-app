"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchResult } from "@/types/assessment";
import { getConfidenceColor } from "@/lib/occupation-matching";

export const MAX_POINTS = 125;

export function getPointsColor(points: number): string {
  if (points >= 65) return "text-green-600 dark:text-green-400";
  if (points >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getStrokeColor(points: number): string {
  if (points >= 65) return "#16a34a";
  if (points >= 50) return "#d97706";
  return "#dc2626";
}

interface TeaserScreenProps {
  points: number;
  matchedOccupations: MatchResult[];
  firstName?: string;
  onUnlock: () => void;
}

/**
 * Teaser screen showing estimated points and top occupation matches.
 * Displays a blurred preview of the full report with an "Unlock Full Report" CTA.
 */
export function TeaserScreen({ points, matchedOccupations, firstName, onUnlock }: TeaserScreenProps) {
  const [displayPoints, setDisplayPoints] = useState(0);

  const circumference = 2 * Math.PI * 54;
  const ratio = Math.min(points / MAX_POINTS, 1);
  const targetOffset = circumference - ratio * circumference;
  const [ringOffset, setRingOffset] = useState(circumference);

  // Animate ring from full offset to target
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRingOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
  }, [targetOffset]);

  // Animated counter from 0 to target points
  useEffect(() => {
    const duration = 1200;
    const steps = points;
    if (steps === 0) return;

    const interval = Math.max(Math.floor(duration / steps), 16);
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      if (current >= points) {
        setDisplayPoints(points);
        clearInterval(timer);
      } else {
        setDisplayPoints(current);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [points]);

  const top3 = matchedOccupations.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background gradient-mesh">
      {/* Brand header */}
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl italic tracking-tight text-foreground">
          imminash
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-lg space-y-10">
          {/* Editorial heading */}
          <div className="space-y-3 animate-reveal-up">
            <h2 className="font-display text-3xl italic text-foreground sm:text-4xl">
              {firstName ? `${firstName}, here's` : "Here's"} what we found
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We matched your background against 574 ANZSCO occupations and ran
              a full points calculation.
            </p>
          </div>

          {/* Points ring - glass card with amber glow */}
          <div
            className="glass-card glow-amber flex items-center gap-6 rounded-2xl p-6 animate-reveal-up delay-100"
            data-testid="points-ring"
          >
            <div className="relative h-24 w-24 shrink-0">
              {/* Ambient glow behind ring */}
              <div
                className="absolute -inset-2 rounded-full blur-xl"
                style={{ background: `${getStrokeColor(points)}20` }}
              />
              <svg className="relative h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="oklch(0.22 0.015 260)"
                  strokeWidth="6"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={getStrokeColor(points)}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 6px ${getStrokeColor(points)}80)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-2xl font-bold tabular-nums ${getPointsColor(points)}`}
                  data-testid="points-value"
                >
                  {displayPoints}
                </span>
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                  / {MAX_POINTS}
                </span>
              </div>
            </div>
            <div>
              <p className="font-display text-lg italic text-foreground">Estimated Points</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {points >= 65
                  ? "Above 65-point threshold"
                  : `${65 - points} more points needed`}{" "}
                - {top3.length} occupation match{top3.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>

          {/* Top 3 occupation matches */}
          <div className="space-y-3" data-testid="occupation-matches">
            {top3.map((result, i) => {
              const colors = getConfidenceColor(result.confidence);
              return (
                <div
                  key={i}
                  className={`glass-card flex items-center justify-between rounded-2xl p-5 transition-all duration-300 hover:border-primary/20 animate-reveal-up delay-${(i + 2) * 100}`}
                  data-testid={`occupation-${i}`}
                >
                  <div>
                    <p className="font-semibold text-foreground">{result.title}</p>
                    {result.anzsco_code && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{result.anzsco_code}</p>
                    )}
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                    }}
                    data-testid={`match-badge-${i}`}
                  >
                    {result.confidence}% Match
                  </span>
                </div>
              );
            })}
          </div>

          {/* Blurred preview with dramatic CTA */}
          <div className="relative animate-reveal-up delay-500">
            {/* Dramatic blurred content */}
            <div className="pointer-events-none select-none space-y-3 opacity-25 blur-sm">
              <div className="glass-card rounded-2xl p-5">
                <p className="font-semibold text-foreground">Points Breakdown</p>
                <p className="text-sm text-muted-foreground">
                  Age: 30pts - English: 20pts - Education: 15pts...
                </p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="font-semibold text-foreground">Visa Pathway Details</p>
                <p className="text-sm text-muted-foreground">
                  Skill Assessing Body - Pathway Signals - Employer Sponsored Options...
                </p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="font-semibold text-foreground">State Nomination Matrix</p>
                <p className="text-sm text-muted-foreground">
                  NSW - VIC - QLD - SA - WA - TAS - ACT - NT eligibility...
                </p>
              </div>
            </div>

            {/* Gradient fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

            {/* CTA button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={onUnlock}
                size="lg"
                className="gap-2.5 rounded-xl bg-primary px-8 py-6 text-base font-semibold text-primary-foreground shadow-2xl glow-amber transition-all hover:shadow-3xl"
                data-testid="unlock-button"
              >
                <Lock className="size-4" />
                Unlock Full Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

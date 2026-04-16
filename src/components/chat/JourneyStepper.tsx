"use client";

/**
 * JourneyStepper — compact session context panel on the left of the chat.
 *
 * Replaced the old 6-row numbered list (which wasted vertical space) with
 * a dense at-a-glance panel: a thin horizontal progress strip across the
 * top, then stacked context cards (match, profile snapshot, documents).
 *
 * Still phase-aware: Phase 1 shows more profile fields, Phase 2+ surfaces
 * the matched occupation + drafted documents.
 */

import { useMemo } from "react";
import { Briefcase, Check, FileText, User } from "lucide-react";
import type { ProjectedConversation } from "@/lib/conversation-state";

interface StepDef {
  key: string;
  label: string;
}

const STEPS: StepDef[] = [
  { key: "personal", label: "Personal details" },
  { key: "occupation", label: "Suggested occupation" },
  { key: "cv", label: "CV" },
  { key: "reference", label: "Employer reference" },
  { key: "documents", label: "Document checklist" },
  { key: "submission", label: "Submission guide" },
];

function deriveStepIndex(projection: ProjectedConversation): number {
  const phase = projection.phase;
  const profile = projection.profile ?? {};
  const hasMatches = projection.matches.length > 0;
  const hasCv = !!projection.cvData;
  const refDocs = projection.documents.filter(
    (d) => d.document_type === "employment_reference",
  );
  const hasReferences = refDocs.length > 0;

  if (phase === "done") return STEPS.length - 1;
  if (phase === "phase2" || phase === "paid") {
    if (hasReferences) return 4;
    if (hasCv) return 3;
    return 2;
  }
  if (phase === "awaiting_payment") return 1;

  const hasBasics =
    profile.age !== undefined &&
    profile.visaStatus !== undefined &&
    profile.englishScore !== undefined;
  if (hasBasics && hasMatches) return 1;
  if (hasBasics) return 1;
  return 0;
}

interface MatchLike {
  title?: string;
  anzsco_code?: string;
  anzscoCode?: string;
  confidence?: number | string;
}

function firstMatch(projection: ProjectedConversation): MatchLike | null {
  const raw = projection.matches as unknown;
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as MatchLike) ?? null;
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const arr =
      (Array.isArray(r.matches) && (r.matches as MatchLike[])) ||
      (Array.isArray(r.skillsMatches) && (r.skillsMatches as MatchLike[])) ||
      null;
    return arr?.[0] ?? null;
  }
  return null;
}

function profileSnapshot(profile: Record<string, unknown>) {
  const entries: Array<[string, string]> = [];
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    entries.push([label, String(value)]);
  };
  add("Age", profile.age);
  add("Visa", profile.visaStatus);
  add("English", profile.englishScore);
  add("Onshore", profile.australianExperience);
  add("Offshore", profile.experience);
  add("Education", profile.educationLevel);
  return entries;
}

export function JourneyStepper({ projection }: { projection: ProjectedConversation }) {
  const current = deriveStepIndex(projection);
  const isPremium =
    projection.phase === "paid" ||
    projection.phase === "phase2" ||
    projection.phase === "done" ||
    Boolean(projection.paidAt);

  const match = firstMatch(projection);
  const profile = projection.profile ?? {};
  const snapshot = useMemo(() => profileSnapshot(profile), [profile]);
  const refDocs = projection.documents.filter(
    (d) => d.document_type === "employment_reference",
  );

  const currentStep = STEPS[current]?.label ?? STEPS[0].label;
  const progressPct = ((current + 1) / STEPS.length) * 100;

  const pointsTotal = useMemo(() => {
    const pts = projection.points as Record<string, unknown> | null;
    if (!pts) return null;
    const t =
      (typeof pts.total === "number" && (pts.total as number)) ||
      (typeof pts.totalPoints === "number" && (pts.totalPoints as number));
    return typeof t === "number" ? t : null;
  }, [projection.points]);

  return (
    <div
      className="flex h-full flex-col overflow-y-auto p-5"
      data-testid="journey-stepper"
    >
      {/* ── Progress strip ────────────────────────────────────── */}
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span
            className={`font-medium uppercase ${
              isPremium
                ? "font-premium-body text-[10px] tracking-[0.14em] text-gold"
                : "text-[10px] tracking-wider text-muted-foreground/70"
            }`}
          >
            Progress
          </span>
          <span className="font-premium-body text-[11px] text-muted-foreground">
            Step {current + 1} / {STEPS.length}
          </span>
        </div>

        {/* Thin dotted stepper */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => {
            const done = i < current;
            const cur = i === current;
            return (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  done
                    ? isPremium
                      ? "bg-gold"
                      : "bg-primary"
                    : cur
                      ? isPremium
                        ? "bg-gold"
                        : "bg-primary"
                      : "bg-muted"
                } ${cur ? "ring-2 ring-offset-2 ring-offset-background" : ""} ${
                  cur ? (isPremium ? "ring-gold/40" : "ring-primary/40") : ""
                }`}
              />
            );
          })}
        </div>

        <p
          className={`mt-3 text-sm ${
            isPremium
              ? "font-serif-premium text-foreground"
              : "font-medium text-foreground"
          }`}
        >
          {currentStep}
        </p>
      </section>

      {/* ── Context: matched occupation ───────────────────────── */}
      {match && (
        <section className="mb-4">
          <ContextLabel>Matched occupation</ContextLabel>
          <div className="mt-2 rounded-md border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    isPremium
                      ? "font-serif-premium font-medium"
                      : "font-medium"
                  } text-foreground`}
                >
                  {match.title ?? "Pending"}
                </p>
                <p className="font-premium-body text-[11px] text-muted-foreground">
                  ANZSCO {match.anzsco_code ?? match.anzscoCode ?? "—"}
                  {match.confidence && (
                    <>
                      {" • "}
                      {typeof match.confidence === "number"
                        ? `${Math.round(match.confidence * 100)}%`
                        : String(match.confidence)}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Context: profile snapshot ─────────────────────────── */}
      {snapshot.length > 0 && (
        <section className="mb-4">
          <ContextLabel>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" />
              Profile
            </span>
          </ContextLabel>
          <dl className="mt-2 grid gap-y-1.5 rounded-md border border-border bg-card p-3 text-xs">
            {snapshot.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="truncate text-right font-medium text-foreground">
                  {value}
                </dd>
              </div>
            ))}
            {pointsTotal !== null && (
              <div className="flex items-baseline justify-between gap-2 border-t border-border/60 pt-1.5 mt-1">
                <dt className="shrink-0 text-muted-foreground">Points</dt>
                <dd
                  className={`text-right font-semibold ${
                    isPremium ? "text-gold" : "text-primary"
                  }`}
                >
                  {pointsTotal}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* ── Context: drafted documents (Phase 2+) ─────────────── */}
      {isPremium && refDocs.length > 0 && (
        <section className="mb-4">
          <ContextLabel>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Drafted
            </span>
          </ContextLabel>
          <ul className="mt-2 space-y-1.5">
            {refDocs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card p-2.5 text-xs"
              >
                <Check className="h-3 w-3 shrink-0 text-gold" />
                <span className="truncate font-serif-premium text-[13px] text-foreground">
                  {d.title.replace(/^Employment Reference — /, "")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="mt-auto pt-4">
        <p
          className={`leading-relaxed text-muted-foreground/50 ${
            isPremium ? "font-premium-body text-[11px] italic" : "text-[11px]"
          }`}
        >
          General information only. Not migration advice.
        </p>
      </div>
    </div>
  );
}

function ContextLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
      {children}
    </span>
  );
}

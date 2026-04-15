"use client";

/**
 * LiveSummaryPanel — pure projection of conversation state.
 * Phase 1: profile fields + collapsible points breakdown + matched occupations.
 * Phase 2: generated documents list.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { DocumentViewer } from "./DocumentViewer";
import type {
  ConversationDocument,
  ProjectedConversation,
} from "@/lib/conversation-state";

interface Match {
  title?: string;
  anzsco_code?: string;
  confidence?: number | string;
}

function extractMatches(raw: unknown): Match[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Match[];
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const skills = Array.isArray(r.skillsMatches) ? (r.skillsMatches as Match[]) : [];
    const employer = Array.isArray(r.employerMatches) ? (r.employerMatches as Match[]) : [];
    return [...skills, ...employer];
  }
  return [];
}

const PROFILE_LABELS: Array<[string, string]> = [
  ["firstName", "Name"],
  ["age", "Age"],
  ["visaStatus", "Visa status"],
  ["englishScore", "English"],
  ["educationLevel", "Education"],
  ["fieldOfStudy", "Field of study"],
  ["jobTitle", "Job title"],
  ["experience", "Offshore experience"],
  ["australianExperience", "Australian experience"],
];

export function LiveSummaryPanel({ projection }: { projection: ProjectedConversation }) {
  const [pointsOpen, setPointsOpen] = useState(true);
  const [openDoc, setOpenDoc] = useState<ConversationDocument | null>(null);

  const isPhase2 =
    projection.phase === "phase2" ||
    projection.phase === "paid" ||
    projection.phase === "done";

  const profile = projection.profile ?? {};
  const points = projection.points as Record<string, unknown> | null;
  const totalPoints =
    (points && (points.total as number | undefined)) ??
    (points && (points.totalPoints as number | undefined)) ??
    null;

  const matches = extractMatches(projection.matches).slice(0, 4);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6" data-testid="live-summary">
      <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {isPhase2 ? "Your documents" : "Your profile"}
      </h2>

      {!isPhase2 && (
        <>
          {/* Profile fields */}
          <section className="mb-6">
            <div className="space-y-2.5">
              {PROFILE_LABELS.map(([key, label]) => {
                const value = profile[key];
                const display =
                  value === undefined || value === null || value === ""
                    ? null
                    : String(value);
                return (
                  <div key={key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-muted-foreground/70">{label}</span>
                    <span
                      className={
                        display
                          ? "text-right font-medium text-foreground"
                          : "text-right text-muted-foreground/30"
                      }
                    >
                      {display ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Points breakdown */}
          {points && (
            <section className="mb-6 rounded-lg border border-border/40 bg-secondary/20 p-3">
              <button
                onClick={() => setPointsOpen((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-foreground"
              >
                <span className="flex items-center gap-2">
                  {pointsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Points estimate
                </span>
                {totalPoints !== null && (
                  <span className="font-display text-lg text-primary">
                    {totalPoints}
                  </span>
                )}
              </button>
              {pointsOpen && (
                <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3 text-xs">
                  {Object.entries(points)
                    .filter(
                      ([k, v]) =>
                        k !== "total" &&
                        k !== "totalPoints" &&
                        (typeof v === "number" || typeof v === "string"),
                    )
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-muted-foreground">
                        <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                        <span className="font-medium text-foreground/80">
                          {typeof v === "number" ? v : String(v ?? "—")}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* Matched occupations */}
          {matches.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                Top matches
              </h3>
              <div className="space-y-2">
                {matches.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/40 bg-secondary/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {m.title ?? "Untitled"}
                        </p>
                        {m.anzsco_code && (
                          <p className="text-[11px] text-muted-foreground/70">
                            ANZSCO {m.anzsco_code}
                          </p>
                        )}
                      </div>
                      {m.confidence !== undefined && m.confidence !== null && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {typeof m.confidence === "number"
                            ? `${Math.round(m.confidence * 100)}%`
                            : String(m.confidence)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isPhase2 && (
        <section>
          <div className="space-y-2">
            {/* Real documents from the database (clickable to open viewer) */}
            {projection.documents.length === 0 && (
              <DocRow
                label="Employment reference"
                state="drafting"
                subtle="Will appear once the draft is ready"
              />
            )}
            {projection.documents.map((d) => (
              <DocRow
                key={d.id}
                label={d.title}
                state={
                  d.status === "approved"
                    ? "ready"
                    : d.status === "in_review" || d.status === "in_progress"
                      ? "drafting"
                      : "drafting"
                }
                onClick={() => setOpenDoc(d)}
              />
            ))}

            {/* Static rows for docs not yet implemented */}
            <DocRow
              label="CV (structured)"
              state={projection.cvData ? "ready" : "pending"}
            />
            <DocRow label="Document checklist" state="pending" />
            <DocRow label="Submission guide" state="pending" />
          </div>
        </section>
      )}

      {openDoc && (
        <DocumentViewer document={openDoc} onClose={() => setOpenDoc(null)} />
      )}
    </div>
  );
}

function DocRow({
  label,
  state,
  subtle,
  onClick,
}: {
  label: string;
  state: "pending" | "drafting" | "ready";
  subtle?: string;
  onClick?: () => void;
}) {
  const color =
    state === "ready"
      ? "text-primary"
      : state === "drafting"
        ? "text-foreground/80"
        : "text-muted-foreground/40";
  const clickable = Boolean(onClick);
  const Wrapper: React.ElementType = clickable ? "button" : "div";
  return (
    <Wrapper
      {...(clickable ? { onClick, type: "button" } : {})}
      className={`flex w-full items-center justify-between rounded-lg border border-border/40 bg-secondary/10 p-3 text-left text-sm transition-colors ${
        clickable ? "cursor-pointer hover:border-primary/30 hover:bg-secondary/30" : ""
      }`}
    >
      <span className="flex items-center gap-2">
        <FileText className={`h-4 w-4 ${color}`} />
        <span className="flex flex-col">
          <span className="text-foreground/90">{label}</span>
          {subtle && (
            <span className="text-[11px] text-muted-foreground/60">{subtle}</span>
          )}
        </span>
      </span>
      <span className={`text-[11px] uppercase tracking-wider ${color}`}>{state}</span>
    </Wrapper>
  );
}

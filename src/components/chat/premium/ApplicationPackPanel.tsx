"use client";

/**
 * ApplicationPackPanel — premium right panel (Phase 2+).
 *
 * Replaces the Phase 2 rendering branch of LiveSummaryPanel. Shows:
 *  - Pack header with applicant + ANZSCO + generation date + gold seal
 *  - Stat cards (points / strength / docs ready)
 *  - Document manifest with click-to-view + per-row download
 *  - Download-all gold CTA
 *  - Footer with MARA disclaimer + upsell link
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { DocumentViewer } from "../DocumentViewer";
import { StatCard } from "./StatCard";
import type {
  ConversationDocument,
  ProjectedConversation,
} from "@/lib/conversation-state";

interface Match {
  title?: string;
  anzsco_code?: string;
  anzscoCode?: string;
  confidence?: number | string;
}

function firstMatch(projection: ProjectedConversation): Match | null {
  const raw = projection.matches;
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as Match) ?? null;
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const arr =
      (Array.isArray(r.matches) && (r.matches as Match[])) ||
      (Array.isArray(r.skillsMatches) && (r.skillsMatches as Match[])) ||
      null;
    return arr?.[0] ?? null;
  }
  return null;
}

/**
 * Application strength combines BOTH factors:
 *  - Points (hard floor: 65 is the 189 visa minimum)
 *  - ACS occupation match confidence
 *
 * Rules:
 *  - Strong:    points >= 80 AND ACS confidence is "Strong"
 *  - Developing: points < 65  OR  ACS confidence is "Weak"
 *  - Moderate:   everything in between
 *
 * Points can never be "masked" by a strong ACS fit — below 65 the user
 * isn't eligible for 189 at all, regardless of how well their ANZSCO
 * aligns. Conversely, great points with a weak occupation match isn't
 * "Strong" because the ACS letters might be challenged.
 */
function deriveStrength(
  pointsTotal: number | null,
  topMatch: Match | null,
): "Strong" | "Moderate" | "Developing" {
  const conf = topMatch?.confidence;
  const confStr = typeof conf === "string" ? conf.toLowerCase() : "";
  const acsStrong = confStr.includes("strong");
  const acsWeak = confStr.includes("weak");

  if (pointsTotal === null || pointsTotal < 65 || acsWeak) return "Developing";
  if (pointsTotal >= 80 && acsStrong) return "Strong";
  return "Moderate";
}

/**
 * Explain WHY the strength landed where it did — call out the limiting
 * factor honestly so the user knows what to work on.
 */
function deriveStrengthCaption(
  pointsTotal: number | null,
  topMatch: Match | null,
  strength: "Strong" | "Moderate" | "Developing",
): string {
  const conf = topMatch?.confidence;
  const confStr = typeof conf === "string" ? conf.toLowerCase() : "";
  const acsStrong = confStr.includes("strong");
  const acsWeak = confStr.includes("weak");

  if (strength === "Strong") {
    return "Competitive points + strong ACS fit. Ready to submit.";
  }
  if (strength === "Developing") {
    if (pointsTotal !== null && pointsTotal < 65) {
      return `At ${pointsTotal} pts you're below the 65-point 189 minimum. State sponsorship (190) or regional (491) pathways are worth considering.`;
    }
    if (acsWeak) {
      return "Your ANZSCO match is weak — refining your duties could strengthen the ACS case.";
    }
    return "A few levers to raise this. Keep chatting to unlock them.";
  }
  // Moderate
  if (pointsTotal !== null && pointsTotal < 80) {
    return `Eligible at ${pointsTotal} pts, but competitive rounds sit at 85+. Lifting English to Superior adds 20 pts.`;
  }
  if (!acsStrong) {
    return "Points are competitive; tightening your duty descriptors can lift ACS fit to Strong.";
  }
  return "Solid foundation. A few levers can raise this to Strong.";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ApplicationPackPanel({
  projection,
}: {
  projection: ProjectedConversation;
}) {
  const router = useRouter();
  const [openDoc, setOpenDoc] = useState<ConversationDocument | null>(null);
  const [downloading, setDownloading] = useState(false);

  const topMatch = firstMatch(projection);
  const anzscoCode =
    topMatch?.anzsco_code ?? topMatch?.anzscoCode ?? projection.selectedAnzscoCode ?? "";
  const occupationTitle = topMatch?.title ?? "";
  const applicantName = useMemo(() => {
    const p = projection.profile ?? {};
    const first =
      typeof p.firstName === "string" && p.firstName.trim().length > 0
        ? (p.firstName as string)
        : null;
    return first ?? "You";
  }, [projection.profile]);

  const pointsTotal = useMemo<number | null>(() => {
    const pts = projection.points as Record<string, unknown> | null;
    if (!pts) return null;
    const total =
      (typeof pts.total === "number" && (pts.total as number)) ||
      (typeof pts.totalPoints === "number" && (pts.totalPoints as number));
    return typeof total === "number" ? total : null;
  }, [projection.points]);

  const strength = deriveStrength(pointsTotal, topMatch);
  const refDocs = projection.documents.filter(
    (d) => d.document_type === "employment_reference",
  );

  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadAll = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(
        `/api/documents/conversation/${projection.id}/download-all`,
        { method: "GET" },
      );
      if (!res.ok) {
        let detail = `${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error as string;
        } catch {
          // not json; leave as status
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("empty response");

      const url = URL.createObjectURL(blob);
      const safeName = applicantName.replace(/[^A-Za-z0-9 _-]/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `Application Pack - ${safeName}.zip`;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      console.error("[download-all] failed:", msg);
      setDownloadError(msg);
    } finally {
      setDownloading(false);
    }
  }, [applicantName, downloading, projection.id]);

  const handleDownloadOne = useCallback(
    async (docId: string, title: string) => {
      try {
        const res = await fetch(
          `/api/documents/conversation/${projection.id}/${docId}?format=pdf`,
        );
        if (!res.ok) throw new Error(`single download failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("single document download failed:", err);
      }
    },
    [projection.id],
  );

  return (
    <div
      className="flex h-full flex-col overflow-y-auto p-6"
      data-testid="application-pack-panel"
    >
      {/* ── Pack header ───────────────────────────────────────── */}
      <div className="premium-stat-reveal mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="premium-seal h-8 w-8 text-gold"
            aria-label="Reviewed against ACS 2026 criteria"
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
            Application pack
          </span>
        </div>
        <h2 className="font-serif-premium text-2xl font-medium leading-tight text-foreground">
          Your application,
          <br />
          drafted.
        </h2>
        <p className="mt-2 font-premium-body text-xs leading-relaxed text-muted-foreground">
          Prepared for {applicantName}
          {occupationTitle ? ` • ${occupationTitle}` : ""}
          {anzscoCode ? ` (ANZSCO ${anzscoCode})` : ""}
          <br />
          Generated {formatDate()}
        </p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3">
        <StatCard
          variant="points"
          label="Your points"
          value={pointsTotal ?? 0}
          target={90}
          min={65}
          highlight={pointsTotal !== null && pointsTotal >= 65}
          delay={0}
        />
        <StatCard
          variant="strength"
          label="Application strength"
          strength={strength}
          caption={deriveStrengthCaption(pointsTotal, topMatch, strength)}
          delay={60}
        />
        <StatCard
          variant="count"
          label="Reference letters drafted"
          value={refDocs.length}
          unit={refDocs.length === 1 ? "letter" : "letters"}
          highlight={refDocs.length > 0}
          caption={
            refDocs.length > 0
              ? `Ready to download as PDF or DOCX`
              : "Drafting starts when you upload your CV"
          }
          delay={120}
        />
      </div>

      {/* ── Document manifest ─────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-3 font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documents in this pack
        </h3>
        <ul className="space-y-2">
          {projection.documents.length === 0 && (
            <li className="rounded-[var(--radius-premium)] border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
              Your drafts will appear here as soon as the first employment reference is ready.
            </li>
          )}
          {projection.documents.map((d, i) => (
            <li key={d.id}>
              <div
                className="premium-stat-reveal group flex items-center gap-3 rounded-[var(--radius-premium)] border border-border bg-card p-3 transition-colors hover:border-gold/40 hover:shadow-sm"
                style={{ animationDelay: `${180 + i * 50}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpenDoc(d)}
                  className="flex flex-1 cursor-pointer items-center gap-3 text-left"
                  aria-label={`Open ${d.title}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-gold-soft group-hover:text-gold">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-serif-premium text-[15px] font-medium text-foreground">
                      {d.title}
                    </span>
                    <span className="font-premium-body text-[11px] capitalize text-muted-foreground">
                      {d.status === "approved"
                        ? "Ready"
                        : d.status === "draft"
                          ? "Draft ready"
                          : d.status.replace(/_/g, " ")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadOne(d.id, d.title)}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label={`Download ${d.title} as PDF`}
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {/* Placeholder rows for pack items not yet drafted */}
          <PackRow
            label="CV (structured)"
            state={projection.cvData ? "ready" : "pending"}
            delay={180 + projection.documents.length * 50}
          />
          <PackRow
            label="Document checklist"
            state={
              projection.phase === "done"
                ? "ready"
                : projection.documents.length > 0
                  ? "drafting"
                  : "pending"
            }
            delay={230 + projection.documents.length * 50}
          />
          <PackRow
            label="Submission guide"
            state={projection.phase === "done" ? "ready" : "pending"}
            onClick={
              projection.phase === "done"
                ? () => router.push(`/chat/submission-guide/${projection.id}`)
                : undefined
            }
            delay={280 + projection.documents.length * 50}
          />
        </ul>
      </section>

      {/* ── Primary CTA ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleDownloadAll}
        disabled={downloading || projection.documents.length === 0}
        className="premium-stat-reveal mb-3 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-premium-body text-sm font-semibold uppercase tracking-[0.08em] text-gold-foreground transition-[filter,transform] duration-200 hover:brightness-110 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ animationDelay: "340ms" }}
        data-testid="download-pack"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing your pack...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download application pack
          </>
        )}
      </button>
      {downloadError && (
        <p
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-premium-body text-[11px] text-destructive"
          role="alert"
        >
          Download failed: {downloadError}. Try again or download individual documents.
        </p>
      )}
      {projection.phase === "done" && (
        <a
          href={`/chat/submission-guide/${projection.id}`}
          className="premium-stat-reveal mb-6 inline-flex items-center justify-center gap-1 rounded-full border border-primary/30 px-5 py-2.5 font-premium-body text-xs font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/5"
          style={{ animationDelay: "380ms" }}
        >
          Open submission guide
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="mt-auto space-y-3 border-t border-border/50 pt-4">
        <div className="flex items-start gap-2 font-premium-body text-[11px] leading-relaxed text-muted-foreground">
          <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
          <span>
            Drafted against ANZSCO {anzscoCode || "criteria"} and ACS 2026 requirements.
            Review, paraphrase, and obtain supervisor signatures before submitting.
          </span>
        </div>
        <p className="font-premium-body text-[10px] italic leading-relaxed text-muted-foreground/70">
          imminash provides general information only. It does not constitute migration advice.
          For personalised legal advice, consult a MARA-registered agent.
        </p>
      </div>

      {openDoc && (
        <DocumentViewer
          document={openDoc}
          conversationId={projection.id}
          onClose={() => setOpenDoc(null)}
        />
      )}
    </div>
  );
}

function PackRow({
  label,
  state,
  delay,
  onClick,
}: {
  label: string;
  state: "pending" | "drafting" | "ready";
  delay: number;
  onClick?: () => void;
}) {
  const tone =
    state === "ready"
      ? "text-gold"
      : state === "drafting"
        ? "text-primary"
        : "text-muted-foreground/50";
  const stateLabel =
    state === "ready" ? "Ready" : state === "drafting" ? "Drafting" : "Pending";
  const clickable = Boolean(onClick);
  const Wrapper = (clickable ? "button" : "div") as React.ElementType;
  return (
    <li>
      <Wrapper
        {...(clickable ? { onClick, type: "button" } : {})}
        className={`premium-stat-reveal flex w-full items-center gap-3 rounded-[var(--radius-premium)] border border-dashed border-border/60 bg-transparent p-3 text-left font-premium-body text-[13px] ${
          clickable
            ? "cursor-pointer transition-colors hover:border-gold/40 hover:bg-gold-soft"
            : ""
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${tone}`}
          aria-hidden
        >
          <FileText className="h-4 w-4" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="font-serif-premium text-[14px] text-foreground">{label}</span>
          <span className={`text-[11px] ${tone}`}>{stateLabel}</span>
        </span>
      </Wrapper>
    </li>
  );
}

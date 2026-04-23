"use client";

/**
 * SubmissionGuide — premium printable page at /chat/submission-guide/[id].
 *
 * Content is AI-generated server-side (see /api/conversations/[id]/
 * submission-guide) using real data from assessing_body_requirements,
 * agent_knowledge, the user's profile, points, and drafted documents.
 *
 * The page never hardcodes specific fees/URLs/timeframes — it either
 * renders what the generator produced or prompts the user to generate.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ProjectedConversation } from "@/lib/conversation-state";
import type {
  SubmissionGuideData,
  SubmissionPlaybook,
  PlaybookStep,
  PlaybookField,
  PlaybookUpload,
} from "@/lib/submission-guide-generator";
import { Check, Copy, FileDown } from "lucide-react";

function firstMatchTitle(projection: ProjectedConversation): string {
  const raw = projection.matches as unknown;
  if (!raw) return "Your nominated occupation";
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw
      ? (raw as { matches?: unknown[] }).matches ?? []
      : [];
  const first = (arr[0] ?? {}) as Record<string, unknown>;
  return typeof first.title === "string" ? first.title : "Your nominated occupation";
}

export function SubmissionGuide({
  projection,
  initialGuide,
}: {
  projection: ProjectedConversation;
  initialGuide?: SubmissionGuideData | null;
}) {
  const [guide, setGuide] = useState<SubmissionGuideData | null>(
    initialGuide ?? null,
  );
  const [playbook, setPlaybook] = useState<SubmissionPlaybook | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attempt to hydrate from server cache on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/conversations/${projection.id}/submission-guide`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (res.ok) {
          const body = await res.json();
          if (body?.playbook) setPlaybook(body.playbook as SubmissionPlaybook);
          if (body?.guide) setGuide(body.guide as SubmissionGuideData);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection.id]);

  const generate = useCallback(
    async (opts: { regenerate?: boolean } = {}) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/conversations/${projection.id}/submission-guide`,
          { method: "POST" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string })?.error ?? `Generation failed (${res.status})`,
          );
        }
        const body = await res.json();
        if (body?.guide) setGuide(body.guide as SubmissionGuideData);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to generate submission guide";
        setError(msg);
      } finally {
        setLoading(false);
      }
      void opts;
    },
    [loading, projection.id],
  );

  const downloadPack = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/documents/conversation/${projection.id}/download-all`,
      );
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const name =
        (guide?.applicantName ?? "Application Pack").replace(
          /[^A-Za-z0-9 _-]/g,
          "",
        ) || "Application Pack";
      const a = document.createElement("a");
      a.href = url;
      a.download = `Application Pack - ${name}.zip`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [downloading, guide, projection.id]);

  const handlePrint = () => window.print();

  // ── Playbook takes precedence when portal_schema is available ───
  if (playbook) {
    return <PlaybookView playbook={playbook} conversationId={projection.id} />;
  }

  // ── Empty state: nothing generated yet ────────────────────────
  if (!guide) {
    const occTitle = firstMatchTitle(projection);
    return (
      <div className="premium min-h-screen bg-background text-foreground">
        <header className="no-print border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 font-premium-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to chat
            </Link>
            <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
              Submission guide
            </span>
          </div>
        </header>

        <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
          <span className="premium-seal mb-5 h-14 w-14">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-serif-premium text-3xl font-medium text-foreground md:text-4xl">
            Generate your submission guide
          </h1>
          <p className="mt-4 max-w-xl font-premium-body text-sm leading-relaxed text-muted-foreground">
            A tailored step-by-step plan for {occTitle}, drawn from your profile, points,
            drafted reference letters, and the latest assessing body requirements on file.
            Not a template; a personalised guide.
          </p>

          {error && (
            <p
              className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 font-premium-body text-xs text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => generate()}
            disabled={loading}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-premium-body text-sm font-semibold uppercase tracking-[0.08em] text-gold-foreground transition-[filter,transform] duration-200 hover:brightness-110 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Drafting your guide...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate submission guide
              </>
            )}
          </button>
          <p className="mt-4 font-premium-body text-[11px] text-muted-foreground/70">
            Usually takes 10 - 20 seconds.
          </p>
        </main>
      </div>
    );
  }

  // ── Rendered guide ───────────────────────────────────────────
  const refDocs = projection.documents.filter(
    (d) => d.document_type === "employment_reference",
  );

  return (
    <div className="premium min-h-screen bg-background text-foreground" data-testid="submission-guide">
      {/* ── Hero strip ───────────────────────────────────────── */}
      <header className="no-print relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at top right, color-mix(in oklch, var(--gold) 40%, transparent), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
          <Link
            href={`/chat`}
            className="mb-6 inline-flex items-center gap-1.5 font-premium-body text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70 transition-colors hover:text-primary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to chat
          </Link>

          <div className="flex items-center gap-2">
            <span className="premium-seal h-9 w-9 border-gold-foreground/30 bg-gold/20 text-gold-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-foreground/90">
              Submission guide
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl font-serif-premium text-4xl font-medium leading-tight md:text-5xl">
            Your application,
            <br />
            ready to submit.
          </h1>
          <p className="mt-4 max-w-2xl font-premium-body text-base leading-relaxed text-primary-foreground/85">
            Prepared for {guide.applicantName} — {guide.occupationTitle}
            {guide.anzscoCode ? ` (ANZSCO ${guide.anzscoCode})` : ""} via {guide.assessingBody}.
            Generated {new Date(guide.generatedAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadPack}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-premium-body text-sm font-semibold uppercase tracking-[0.08em] text-gold-foreground transition-[filter,transform] duration-200 hover:brightness-110 hover:-translate-y-[1px] disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing pack...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download application pack
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-5 py-3 font-premium-body text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              <Printer className="h-4 w-4" />
              Print or save as PDF
            </button>
            <button
              type="button"
              onClick={() => generate({ regenerate: true })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-3 font-premium-body text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 disabled:opacity-50"
              title="Regenerate with latest data"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate
            </button>
          </div>

          {error && (
            <p
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/20 px-3 py-2 font-premium-body text-xs text-destructive-foreground"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </header>

      {/* Print header */}
      <header className="hidden print:block px-10 py-8">
        <h1 className="font-serif-premium text-3xl">
          Submission Guide — {guide.applicantName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {guide.occupationTitle}
          {guide.anzscoCode ? ` (ANZSCO ${guide.anzscoCode})` : ""} via{" "}
          {guide.assessingBody}.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* Snapshot */}
        <section className="mb-12 rounded-[var(--radius-premium)] border border-border bg-card p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <SnapshotItem label="Applicant" value={guide.applicantName} />
            <SnapshotItem
              label="Occupation"
              value={`${guide.occupationTitle}${guide.anzscoCode ? ` • ${guide.anzscoCode}` : ""}`}
            />
            <SnapshotItem label="Assessing body" value={guide.assessingBody} />
            <SnapshotItem label="Fees" value={guide.feeNote} />
            <SnapshotItem label="Turnaround" value={guide.turnaround} />
            <SnapshotItem
              label="References drafted"
              value={`${refDocs.length} letter${refDocs.length === 1 ? "" : "s"}`}
            />
          </div>
        </section>

        {/* Manifest */}
        {guide.manifest.length > 0 && (
          <section className="mb-12">
            <SectionTitle eyebrow="Document manifest" title="Pack contents" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guide.manifest.map((item, i) => (
                <ManifestCard
                  key={i}
                  item={item}
                  onAction={
                    item.reference === "employment_references"
                      ? downloadPack
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        {guide.timeline.length > 0 && (
          <section className="mb-12">
            <SectionTitle eyebrow="Step-by-step" title="Submission timeline" />
            <ol className="space-y-5">
              {guide.timeline.map((step, i) => (
                <li
                  key={i}
                  className="relative rounded-[var(--radius-premium)] border border-border bg-card p-5 pl-14"
                >
                  <span className="absolute left-5 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-serif-premium text-lg font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 font-premium-body text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* External links */}
        {guide.links.length > 0 && (
          <section className="mb-12 grid gap-4 md:grid-cols-2">
            {guide.links.map((l, i) => (
              <ExternalCard key={i} title={l.title} detail={l.detail} href={l.href} />
            ))}
          </section>
        )}

        {/* Strengths + watchpoints */}
        {(guide.strengths.length > 0 || guide.watchpoints.length > 0) && (
          <section className="mb-12 grid gap-4 md:grid-cols-2">
            {guide.strengths.length > 0 && (
              <div className="rounded-[var(--radius-premium)] border border-gold/40 bg-gold-soft p-5">
                <h3 className="mb-3 flex items-center gap-2 font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Strengths
                </h3>
                <ul className="space-y-2 font-premium-body text-sm leading-relaxed text-foreground/90">
                  {guide.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guide.watchpoints.length > 0 && (
              <div className="rounded-[var(--radius-premium)] border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  <Circle className="h-3.5 w-3.5" />
                  Watchpoints
                </h3>
                <ul className="space-y-2 font-premium-body text-sm leading-relaxed text-foreground/90">
                  {guide.watchpoints.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* MARA upsell */}
        <section className="mb-12 rounded-[var(--radius-premium)] border border-border bg-card p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-serif-premium text-xl font-medium text-foreground">
                Want a MARA agent to review your pack before submitting?
              </h3>
              <p className="mt-1 font-premium-body text-sm leading-relaxed text-muted-foreground">
                Our partner MARA-registered agents can audit your application pack and
                flag risks before lodgement. Recommended for borderline points scores
                and complex employment histories.
              </p>
            </div>
            <Link
              href="/chat"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-primary/30 px-5 py-2.5 font-premium-body text-xs font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/5 md:self-auto"
            >
              Book a consultation
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Disclaimer */}
        <footer className="border-t border-border/70 pt-6">
          <p className="font-premium-body text-xs italic leading-relaxed text-muted-foreground">
            imminash provides general information only. It does not constitute
            migration advice and does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for personalised
            legal advice. Content generated automatically from your profile and the
            latest assessing body requirements on file. Always verify fees,
            turnaround times, and URLs against the official portal before submitting.
          </p>
        </footer>
      </main>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-serif-premium text-base font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif-premium text-2xl font-medium text-foreground">
        {title}
      </h2>
    </div>
  );
}

function ManifestCard({
  item,
  onAction,
}: {
  item: {
    title: string;
    detail: string;
    state: "ready" | "needs-action";
    reference?: "employment_references" | "cv" | null;
  };
  onAction?: () => void;
}) {
  const isReady = item.state === "ready";
  return (
    <div
      className={`flex flex-col rounded-[var(--radius-premium)] border bg-card p-5 ${
        isReady ? "border-gold/40" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {isReady ? (
          <CheckCircle2 className="h-4 w-4 text-gold" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span
          className={`font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] ${
            isReady ? "text-gold" : "text-muted-foreground"
          }`}
        >
          {isReady ? "Ready" : "Needs action"}
        </span>
      </div>
      <h3 className="mb-1 font-serif-premium text-lg font-medium text-foreground">
        {item.title}
      </h3>
      <p className="font-premium-body text-sm leading-relaxed text-muted-foreground">
        {item.detail}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-primary/30 px-3 py-1.5 font-premium-body text-[11px] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/5 no-print"
        >
          Download
        </button>
      )}
    </div>
  );
}

function ExternalCard({
  title,
  detail,
  href,
}: {
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-[var(--radius-premium)] border border-border bg-card p-5 transition-colors hover:border-gold/40 hover:bg-gold-soft"
    >
      <div>
        <h3 className="font-serif-premium text-lg font-medium text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 font-premium-body text-sm text-muted-foreground">
          {detail}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-gold" />
    </a>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-premium-body font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold hover:text-gold no-print"
      aria-label={`${label} ${value.slice(0, 30)}`}
    >
      {copied ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function PlaybookFieldRow({ field }: { field: PlaybookField }) {
  return (
    <div className="grid grid-cols-[220px_1fr_auto] items-start gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <div>
        <p className="font-premium-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {field.label}
        </p>
        {field.notes && (
          <p className="mt-0.5 font-premium-body text-[10px] italic leading-snug text-muted-foreground/70">
            {field.notes}
          </p>
        )}
      </div>
      <div className="font-serif-premium text-[13px] leading-snug text-foreground">
        {field.value ? (
          <span>{field.value}</span>
        ) : (
          <span className="font-premium-body text-[11px] italic text-destructive">Missing</span>
        )}
        {field.type === "dropdown" && field.options && field.options.length > 0 && (
          <p className="mt-0.5 font-premium-body text-[10px] text-muted-foreground">
            Select from portal dropdown.
          </p>
        )}
      </div>
      <div>
        {field.copyable && field.value ? (
          <CopyButton value={field.value} />
        ) : (
          <span className="font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground/50">
            {field.type === "display_only" ? "Display" : field.type}
          </span>
        )}
      </div>
    </div>
  );
}

function PlaybookUploadRow({
  upload,
  conversationId,
}: {
  upload: PlaybookUpload;
  conversationId: string;
}) {
  return (
    <div className="grid grid-cols-[220px_1fr_auto] items-start gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <div>
        <p className="font-premium-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {upload.label}
        </p>
        {upload.notes && (
          <p className="mt-0.5 font-premium-body text-[10px] italic leading-snug text-muted-foreground/70">
            {upload.notes}
          </p>
        )}
        {upload.conditional && (
          <p className="mt-0.5 font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Required if: {upload.conditional}
          </p>
        )}
      </div>
      <div className="font-mono text-[12px] text-foreground">
        {upload.filename}
      </div>
      <div>
        {upload.documentId ? (
          <a
            href={`/api/documents/conversation/${conversationId}/${upload.documentId}?format=pdf`}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-gold px-2 font-premium-body text-[11px] font-semibold uppercase tracking-wider text-gold-foreground transition-[filter] hover:brightness-110 no-print"
          >
            <FileDown className="h-3 w-3" />
            PDF
          </a>
        ) : (
          <span className="font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground/60">
            You provide
          </span>
        )}
      </div>
    </div>
  );
}

function PlaybookStepSection({
  step,
  conversationId,
}: {
  step: PlaybookStep;
  conversationId: string;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 font-serif-premium text-base font-medium text-gold">
          {step.stepNumber}
        </span>
        <h2 className="font-serif-premium text-xl font-medium text-foreground md:text-2xl">
          {step.title}
        </h2>
      </div>
      {step.helper && (
        <p className="mb-4 font-premium-body text-sm leading-relaxed text-muted-foreground">
          {step.helper}
        </p>
      )}
      {step.displayOnly && (
        <p className="rounded-md border border-border/60 bg-card p-3 font-premium-body text-xs italic text-muted-foreground">
          Populated by the assessing body after submission. No input required here.
        </p>
      )}
      {step.fields && step.fields.length > 0 && (
        <div className="mb-4 rounded-[var(--radius-premium)] border border-border bg-card p-4">
          {step.fields.map((f) => (
            <PlaybookFieldRow key={f.key} field={f} />
          ))}
        </div>
      )}
      {step.uploads && step.uploads.length > 0 && (
        <div className="mb-4 rounded-[var(--radius-premium)] border border-border bg-card p-4">
          <p className="mb-2 font-premium-body text-[11px] font-semibold uppercase tracking-wider text-gold">
            Upload files
          </p>
          {step.uploads.map((u) => (
            <PlaybookUploadRow key={u.slot} upload={u} conversationId={conversationId} />
          ))}
        </div>
      )}
      {step.instances && step.instances.length > 0 && (
        <div className="space-y-4">
          {step.instances.map((inst) => (
            <div
              key={inst.key}
              className="rounded-[var(--radius-premium)] border border-border bg-card p-4"
            >
              <h3 className="mb-3 font-serif-premium text-base font-medium text-foreground">
                {inst.label}
              </h3>
              {inst.fields.length > 0 && inst.fields.map((f) => (
                <PlaybookFieldRow key={f.key} field={f} />
              ))}
              {inst.uploads.length > 0 && (
                <>
                  <p className="mb-2 mt-4 font-premium-body text-[11px] font-semibold uppercase tracking-wider text-gold">
                    Upload files for {inst.label}
                  </p>
                  {inst.uploads.map((u) => (
                    <PlaybookUploadRow key={u.slot} upload={u} conversationId={conversationId} />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {step.instances && step.instances.length === 0 && (
        <p className="rounded-md border border-border/60 bg-card p-3 font-premium-body text-xs italic text-muted-foreground">
          No entries yet. Add them via chat before filing.
        </p>
      )}
    </section>
  );
}

function PlaybookView({
  playbook,
  conversationId,
}: {
  playbook: SubmissionPlaybook;
  conversationId: string;
}) {
  return (
    <div className="premium min-h-screen bg-background text-foreground" data-testid="submission-playbook">
      <header className="no-print border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 font-premium-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to chat
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
              {playbook.assessingBody} submission playbook
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-premium-body text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-10">
          <p className="font-premium-body text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
            Prepared for {playbook.applicantName}
          </p>
          <h1 className="mt-2 font-serif-premium text-3xl font-medium text-foreground md:text-4xl">
            {playbook.occupationTitle}
            {playbook.anzscoCode && (
              <span className="ml-2 font-premium-body text-lg text-muted-foreground">
                ANZSCO {playbook.anzscoCode}
              </span>
            )}
          </h1>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground">Portal</p>
              <a
                href={playbook.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate font-premium-body text-xs text-gold hover:underline"
              >
                {playbook.portalUrl}
              </a>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground">Fee</p>
              <p className="mt-1 font-serif-premium text-sm text-foreground">
                {playbook.fee.amount ? `${playbook.fee.currency} ${playbook.fee.amount.toLocaleString()}` : "See portal"}
                {playbook.fee.asOf && (
                  <span className="ml-1 font-premium-body text-[10px] text-muted-foreground">
                    as of {playbook.fee.asOf}
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-premium-body text-[10px] uppercase tracking-wider text-muted-foreground">Typical wait</p>
              <p className="mt-1 font-serif-premium text-sm text-foreground">
                {playbook.postSubmission.typicalWait || "See portal"}
              </p>
            </div>
          </div>

          <p className="mt-5 rounded-md border border-gold/30 bg-gold-soft/20 p-3 font-premium-body text-xs leading-relaxed text-foreground">
            Log into the portal and walk these steps top to bottom. Copy the value
            next to each field, pick the dropdown match where applicable, and
            upload the files with the exact filenames shown. When you hit
            declarations, read each one before ticking. Don&apos;t submit
            until every required field and file is in place.
          </p>
        </div>

        {playbook.steps.map((step) => (
          <PlaybookStepSection
            key={step.id}
            step={step}
            conversationId={conversationId}
          />
        ))}

        <footer className="mt-14 border-t border-border/60 pt-6">
          <p className="font-premium-body text-[11px] italic leading-relaxed text-muted-foreground">
            Playbook generated from the live application form schema and your
            drafted documents on {new Date(playbook.generatedAt).toLocaleString()}.
            Fee and processing time may change; confirm on the portal before paying.
            Imminash is not a registered migration agent.
          </p>
        </footer>
      </main>
    </div>
  );
}

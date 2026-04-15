"use client";

/**
 * SubmissionGuide — premium dedicated route for the Phase 2+ deliverable.
 *
 * Replaces the disposable chat-message version of the submission guide.
 * Renders as a full-page printable artefact with:
 *  - Hero strip (navy bg, serif headline, gold CTAs)
 *  - Applicant snapshot card
 *  - Document manifest (3-column grid) with download links
 *  - Step-by-step submission timeline
 *  - Strengths / watchpoints callouts
 *  - MARA disclaimer + consultation upsell
 *
 * Print styles in globals.css strip chrome and produce a clean handout.
 */

import { useCallback, useState } from "react";
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
  ShieldCheck,
} from "lucide-react";
import type { ProjectedConversation } from "@/lib/conversation-state";

interface Match {
  title?: string;
  anzsco_code?: string;
  anzscoCode?: string;
  assessing_authority?: string;
  assessingAuthority?: string;
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

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubmissionGuide({
  projection,
}: {
  projection: ProjectedConversation;
}) {
  const [downloading, setDownloading] = useState(false);
  const topMatch = firstMatch(projection);
  const profile = projection.profile ?? {};
  const applicantName =
    typeof profile.firstName === "string" && profile.firstName.trim().length > 0
      ? (profile.firstName as string)
      : "Applicant";
  const occupationTitle = topMatch?.title ?? "Your nominated occupation";
  const anzscoCode =
    topMatch?.anzsco_code ?? topMatch?.anzscoCode ?? projection.selectedAnzscoCode ?? "";
  const assessingBody =
    topMatch?.assessing_authority ?? topMatch?.assessingAuthority ?? "ACS";

  const points = projection.points as Record<string, unknown> | null;
  const totalPoints =
    (points && typeof points.total === "number" && (points.total as number)) ||
    (points && typeof points.totalPoints === "number" && (points.totalPoints as number)) ||
    null;

  const refDocs = projection.documents.filter(
    (d) => d.document_type === "employment_reference",
  );

  const acsPortalUrl = anzscoCode
    ? `https://www.acs.org.au/mra?anzsco=${encodeURIComponent(anzscoCode)}`
    : "https://www.acs.org.au/mra";

  const handleDownloadAll = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/documents/conversation/${projection.id}/download-all`,
      );
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `Application Pack — ${applicantName}.zip`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("download all failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [applicantName, downloading, projection.id]);

  const handlePrint = () => window.print();

  // Strengths / watchpoints heuristics
  const strengths: string[] = [];
  const watchpoints: string[] = [];
  if (totalPoints !== null) {
    if (totalPoints >= 65) {
      strengths.push(`Your ${totalPoints} points exceeds the 65-point minimum for the 189 visa.`);
    } else {
      watchpoints.push(
        `Your ${totalPoints} points is below the 65-point minimum. State sponsorship (190) or regional (491) options remain open.`,
      );
    }
    if (totalPoints < 80) {
      watchpoints.push(
        "Lifting your English from Proficient to Superior would add up to 20 points.",
      );
    }
  }
  const conf = topMatch?.confidence;
  if (typeof conf === "string" && conf.toLowerCase().includes("strong")) {
    strengths.push(
      `Your ANZSCO ${anzscoCode} match confidence is "${conf}" — your CV and duties closely align.`,
    );
  }
  if (refDocs.length > 0) {
    strengths.push(
      `${refDocs.length} employment reference letter${refDocs.length === 1 ? " has" : "s have"} been drafted against ANZSCO criteria.`,
    );
  }

  const manifestItems: Array<{
    title: string;
    detail: string;
    state: "ready" | "needs-action";
    actionLabel?: string;
    onAction?: () => void;
  }> = [
    {
      title: `Employment reference letters (${refDocs.length})`,
      detail: refDocs
        .map((d) => d.title.replace(/^Employment Reference — /, ""))
        .join(", ") || "Generated from your conversation",
      state: refDocs.length > 0 ? "ready" : "needs-action",
      actionLabel: refDocs.length > 0 ? "Download" : "Continue chat",
      onAction:
        refDocs.length > 0
          ? () => handleDownloadAll()
          : undefined,
    },
    {
      title: "Structured CV",
      detail: projection.cvData
        ? "Parsed and stored against your conversation"
        : "Upload required to complete the pack",
      state: projection.cvData ? "ready" : "needs-action",
    },
    {
      title: "Academic transcripts & testamur",
      detail: "Required by ACS — obtain from your university",
      state: "needs-action",
    },
    {
      title: "Passport bio page",
      detail: "Colour scan; ensure expiry > 6 months",
      state: "needs-action",
    },
    {
      title: "English test score report",
      detail: "IELTS/PTE/TOEFL — original report from the test provider",
      state: "needs-action",
    },
    {
      title: "Professional headshot photo",
      detail: "Required for some assessing bodies; check ACS guidance",
      state: "needs-action",
    },
  ];

  const timeline: Array<{ title: string; detail: string }> = [
    {
      title: "1. Print, sign, and scan your reference letters",
      detail:
        "Use company letterhead. Ask each supervisor to sign and date in ink. Scan as PDF.",
    },
    {
      title: `2. Create or sign in to your ${assessingBody} portal`,
      detail: `Open ${acsPortalUrl} and start a new Skills Assessment for ANZSCO ${anzscoCode}.`,
    },
    {
      title: "3. Upload your documents in this exact order",
      detail:
        "CV, transcripts, testamur, passport, English test report, employment reference letters per role, headshot.",
    },
    {
      title: `4. Pay the ${assessingBody} assessment fee`,
      detail:
        "ACS fee is currently A$500 (subject to change). Payment is by credit card.",
    },
    {
      title: "5. Wait for your assessment outcome",
      detail:
        "Typical turnaround: 4-6 weeks. ACS may request additional evidence — respond promptly.",
    },
    {
      title: "6. Once positive, lodge your EOI via SkillSelect",
      detail:
        "Submit at https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect with your assessment outcome.",
    },
  ];

  return (
    <div className="premium min-h-screen bg-background text-foreground" data-testid="submission-guide">
      {/* ── Hero strip ───────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-primary text-primary-foreground no-print">
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
            Prepared for {applicantName} — {occupationTitle}
            {anzscoCode ? ` (ANZSCO ${anzscoCode})` : ""} via {assessingBody}.
            Generated {formatDate()}.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadAll}
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
          </div>
        </div>
      </header>

      {/* Print-only header */}
      <header className="hidden print:block px-10 py-8">
        <h1 className="font-serif-premium text-3xl">Submission Guide — {applicantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {occupationTitle} (ANZSCO {anzscoCode}) via {assessingBody}. Generated {formatDate()}.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* Snapshot */}
        <section className="mb-12 rounded-[var(--radius-premium)] border border-border bg-card p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <SnapshotItem label="Applicant" value={applicantName} />
            <SnapshotItem
              label="Occupation"
              value={`${occupationTitle}${anzscoCode ? ` • ${anzscoCode}` : ""}`}
            />
            <SnapshotItem label="Assessing body" value={assessingBody} />
            <SnapshotItem
              label="Points total"
              value={totalPoints !== null ? `${totalPoints} points` : "Pending"}
            />
            <SnapshotItem
              label="Match confidence"
              value={typeof conf === "string" ? conf : "—"}
            />
            <SnapshotItem label="Estimated turnaround" value="4 – 6 weeks (ACS)" />
          </div>
        </section>

        {/* Manifest */}
        <section className="mb-12">
          <SectionTitle eyebrow="Document manifest" title="Pack contents" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {manifestItems.map((item) => (
              <ManifestCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-12">
          <SectionTitle eyebrow="Step-by-step" title="Submission timeline" />
          <ol className="space-y-5">
            {timeline.map((step, i) => (
              <li
                key={step.title}
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

        {/* External CTAs */}
        <section className="mb-12 grid gap-4 md:grid-cols-2">
          <ExternalCard
            title={`Open the ${assessingBody} portal`}
            detail={`Pre-filled for ANZSCO ${anzscoCode}`}
            href={acsPortalUrl}
          />
          <ExternalCard
            title="SkillSelect EOI portal"
            detail="Lodge your EOI once your assessment is positive"
            href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect"
          />
        </section>

        {/* Strengths + watchpoints */}
        {(strengths.length > 0 || watchpoints.length > 0) && (
          <section className="mb-12 grid gap-4 md:grid-cols-2">
            {strengths.length > 0 && (
              <div className="rounded-[var(--radius-premium)] border border-gold/40 bg-gold-soft p-5">
                <h3 className="mb-3 flex items-center gap-2 font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Strengths
                </h3>
                <ul className="space-y-2 font-premium-body text-sm leading-relaxed text-foreground/90">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {watchpoints.length > 0 && (
              <div className="rounded-[var(--radius-premium)] border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-premium-body text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  <Circle className="h-3.5 w-3.5" />
                  Watchpoints
                </h3>
                <ul className="space-y-2 font-premium-body text-sm leading-relaxed text-foreground/90">
                  {watchpoints.map((w, i) => (
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
            legal advice. Generated automatically from your conversation on
            {" "}
            {formatDate()}.
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
}: {
  item: {
    title: string;
    detail: string;
    state: "ready" | "needs-action";
    actionLabel?: string;
    onAction?: () => void;
  };
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
      {item.actionLabel && item.onAction && (
        <button
          type="button"
          onClick={item.onAction}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-primary/30 px-3 py-1.5 font-premium-body text-[11px] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/5 no-print"
        >
          {item.actionLabel}
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

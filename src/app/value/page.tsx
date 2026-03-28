"use client";

/**
 * Value page: intermediate context between sign-in and workspace.
 * Shows personalised headline, deliverables, sample output, social proof,
 * and single CTA to proceed to /workspace. No payment gate (deferred).
 *
 * CTO Brief v2 section 4.3
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ValuePageData {
  firstName: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingAuthority: string;
}

const DELIVERABLES = [
  {
    icon: FileText,
    title: "Employment Reference Letters",
    description:
      "Professionally drafted reference letters with ANZSCO-aligned duty statements for each employer.",
  },
  {
    icon: FileCheck,
    title: "Supporting Statement",
    description:
      "A comprehensive supporting statement that maps your experience to your nominated occupation.",
  },
  {
    icon: BookOpen,
    title: "CPD Activity Log",
    description:
      "A structured Continuing Professional Development log covering courses, conferences, and self-study.",
  },
  {
    icon: ClipboardList,
    title: "Document Checklist",
    description:
      "A complete checklist of every document you need, with status tracking and submission guidance.",
  },
];

export default function ValuePage() {
  const router = useRouter();
  const [data, setData] = useState<ValuePageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          router.push("/results");
          return;
        }

        // Load latest assessment for personalisation
        const { data: assessment } = await supabase
          .from("assessments")
          .select("profile_data, matched_occupations")
          .eq("user_id", sessionData.session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!assessment) {
          router.push("/workspace");
          return;
        }

        const profileData = assessment.profile_data as Record<string, unknown>;
        const matchedOccupations = assessment.matched_occupations as Record<string, unknown>;
        const skillsMatches = Array.isArray(matchedOccupations?.skillsMatches)
          ? (matchedOccupations.skillsMatches as Array<Record<string, unknown>>)
          : [];

        // Check if user selected a specific occupation
        let selectedAnzsco: string | null = null;
        try {
          selectedAnzsco = sessionStorage.getItem("imminash_selected_occupation");
        } catch { /* ignore */ }

        let primaryMatch: Record<string, unknown> = skillsMatches[0] || {};
        if (selectedAnzsco) {
          const selected = skillsMatches.find(
            (m) => (m.anzsco_code as string) === selectedAnzsco,
          );
          if (selected) primaryMatch = selected;
        }

        setData({
          firstName: (profileData.firstName as string) || "",
          occupationTitle: (primaryMatch.title as string) || "",
          anzscoCode:
            (primaryMatch.anzsco_code as string) ||
            (primaryMatch.anzscoCode as string) ||
            "",
          assessingAuthority:
            (primaryMatch.assessing_authority as string) ||
            (primaryMatch.assessingAuthority as string) ||
            "",
        });
      } catch (error) {
        console.error("Value page load error:", error);
        router.push("/workspace");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const headline = data.firstName
    ? `${data.firstName}, your skill assessment documents are ready to be prepared`
    : "Your skill assessment documents are ready to be prepared";

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      {/* Brand header */}
      <header className="mx-auto flex w-full max-w-3xl items-center px-6 py-6">
        <span
          className="font-display text-2xl italic tracking-tight"
          style={{ color: "oklch(0.62 0.17 250)" }}
        >
          imminash
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 pb-20">
        {/* Personalised headline */}
        <div className="space-y-4 animate-reveal-up">
          <h1 className="font-display text-3xl font-normal italic text-foreground sm:text-4xl leading-tight">
            {headline}
          </h1>
          {data.occupationTitle && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              For <strong className="text-foreground">{data.occupationTitle}</strong>
              {data.anzscoCode && ` (ANZSCO ${data.anzscoCode})`}
              {data.assessingAuthority && ` assessed by ${data.assessingAuthority}`}
            </p>
          )}
        </div>

        {/* What you'll get */}
        <div className="mt-12 space-y-6 animate-reveal-up delay-100">
          <h2 className="font-display text-xl italic text-foreground">
            What you will receive
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {DELIVERABLES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="glass-card rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: "oklch(0.62 0.17 250 / 0.12)" }}
                    >
                      <Icon
                        className="h-4.5 w-4.5"
                        style={{ color: "oklch(0.62 0.17 250)" }}
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 space-y-5 animate-reveal-up delay-200">
          <h2 className="font-display text-xl italic text-foreground">
            How it works
          </h2>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            {[
              "Our AI interviews you about your work experience, one employer at a time",
              "Your duties are rewritten to align with official ANZSCO task descriptors",
              "Reference letters, supporting statement, and CPD log are generated",
              "You review, approve, and download a complete document package",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "oklch(0.62 0.17 250 / 0.12)",
                    color: "oklch(0.62 0.17 250)",
                  }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed pt-0.5">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample output preview (blurred placeholder) */}
        <div className="mt-12 animate-reveal-up delay-200">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 z-10" />
            <div className="blur-[2px] select-none pointer-events-none space-y-3 opacity-60">
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest">
                Sample Reference Letter
              </p>
              <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
              <div className="h-3 w-full rounded bg-muted-foreground/20" />
              <div className="h-3 w-5/6 rounded bg-muted-foreground/20" />
              <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
              <div className="h-3 w-full rounded bg-muted-foreground/20" />
              <div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
              <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
            </div>
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <span
                className="rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-sm"
                style={{
                  background: "oklch(0.62 0.17 250 / 0.15)",
                  color: "oklch(0.62 0.17 250)",
                }}
              >
                Preview unlocked after document generation
              </span>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-8 flex items-center justify-center gap-2 animate-reveal-up delay-300">
          <ShieldCheck
            className="h-4 w-4"
            style={{ color: "oklch(0.72 0.17 155)" }}
          />
          <p className="text-xs text-muted-foreground">
            Trusted by applicants across 50+ occupations
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mt-8 animate-reveal-up delay-300">
          <button
            onClick={() => router.push("/workspace")}
            className="glow-primary group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-lg font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            data-testid="value-cta"
          >
            Start preparing my documents
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Free during beta. No credit card required.
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 animate-reveal-up delay-300">
          {[
            "ANZSCO-aligned duties",
            "ACS-ready format",
            "Download as Word + PDF",
          ].map((badge) => (
            <div key={badge} className="flex items-center gap-1.5">
              <CheckCircle
                className="h-3.5 w-3.5"
                style={{ color: "oklch(0.72 0.17 155)" }}
              />
              <span className="text-xs text-muted-foreground">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

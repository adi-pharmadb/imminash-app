"use client";

/**
 * Value page: intermediate context between sign-in and workspace.
 * Shows personalised headline, deliverables, sample output, social proof,
 * price, and Stripe Checkout CTA.
 *
 * CTO Brief v2 section 4.3
 */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  ClipboardList,
  BookOpen,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ValuePageData {
  firstName: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingAuthority: string;
  assessmentId?: string;
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
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ValuePageContent />
    </Suspense>
  );
}

function ValuePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ValuePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
          router.push("/results");
          return;
        }

        // Check payment status
        const paymentRes = await fetch("/api/check-payment");
        const paymentData = await paymentRes.json();
        if (paymentData.paid) {
          setHasPaid(true);
        }

        // Check if returning from successful Stripe Checkout
        const paymentParam = searchParams.get("payment");
        if (paymentParam === "success") {
          setPaymentSuccess(true);
          setHasPaid(true);
        }

        // Load latest assessment for personalisation
        const { data: assessment } = await supabase
          .from("assessments")
          .select("id, profile_data, matched_occupations")
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
          assessmentId: assessment.id,
        });
      } catch (error) {
        console.error("Value page load error:", error);
        router.push("/workspace");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, searchParams]);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: data?.assessmentId }),
      });

      const result = await res.json();

      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        console.error("No checkout URL returned:", result);
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutLoading(false);
    }
  }, [data, router]);

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
        {/* Payment success banner */}
        {paymentSuccess && (
          <div
            className="mb-8 rounded-2xl p-5 flex items-center gap-3 animate-reveal-up"
            style={{ background: "oklch(0.72 0.17 155 / 0.1)", border: "1px solid oklch(0.72 0.17 155 / 0.3)" }}
          >
            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "oklch(0.72 0.17 155)" }} />
            <div>
              <p className="text-sm font-semibold text-foreground">Payment confirmed</p>
              <p className="text-sm text-muted-foreground">Your document workspace is ready. Click below to get started.</p>
            </div>
          </div>
        )}

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
            Based on official ANZSCO occupation lists and DHA points tables
          </p>
        </div>

        {/* Quality Guarantee */}
        <div className="mt-8 animate-reveal-up delay-300">
          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "oklch(0.72 0.17 155 / 0.12)" }}
            >
              <ShieldCheck
                className="h-5 w-5"
                style={{ color: "oklch(0.72 0.17 155)" }}
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Quality Guarantee
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If your skills assessment is refused on documentation quality grounds, we will revise at no charge.
              </p>
            </div>
          </div>
        </div>

        {/* Price display + CTA */}
        {hasPaid ? (
          /* Already paid - show go to workspace */
          <div className="mt-8 animate-reveal-up delay-300">
            <button
              onClick={() => router.push("/workspace")}
              className="glow-primary group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-lg font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              data-testid="value-cta"
            >
              Start preparing my documents
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ) : (
          /* Not paid - show price and checkout */
          <>
            <div className="mt-8 text-center animate-reveal-up delay-300">
              <p className="text-3xl font-bold text-foreground">$199 <span className="text-lg font-normal text-muted-foreground">AUD</span></p>
              <p className="mt-1 text-sm text-muted-foreground">One-time payment. No subscription.</p>
            </div>

            <div className="mt-6 animate-reveal-up delay-300">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="glow-primary group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-lg font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="value-cta"
              >
                {checkoutLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Redirecting to checkout...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay and start preparing my documents
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <div className="mt-3 flex items-center justify-center gap-4">
                <p className="text-xs text-muted-foreground">Secure payment via Stripe</p>
              </div>
            </div>
          </>
        )}

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

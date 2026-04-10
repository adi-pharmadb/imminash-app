"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, FileText, Calculator, MapPin, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/chat");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-black selection:bg-primary/30" data-testid="home-page">
      
      {/* ── Hero Section ── */}
      <section className="relative w-full max-w-7xl px-6 pt-32 pb-20 sm:pt-40 lg:pb-32 overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute top-[-10%] left-[-5%] size-[600px] rounded-full opacity-20 blur-[120px] bg-primary" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] size-[500px] rounded-full opacity-15 blur-[100px] bg-emerald-500" aria-hidden="true" />
        
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Copy */}
          <div className="space-y-8 z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/80 backdrop-blur-md mb-6">
                <Sparkles className="size-4 text-primary" />
                <span>Imminash 2.0 is live</span>
              </div>
              <h1 className="font-display text-6xl leading-[0.9] tracking-tighter text-white sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem]">
                Crack the <br />
                <span className="italic text-primary">PR code.</span>
              </h1>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-lg text-lg leading-relaxed text-white/60 sm:text-xl"
            >
              Australian PR, minus the bureaucratic bullshit. Chat with an AI strategist that knows the DHA rules, calculates your points, and drafts your documents instantly.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-4"
            >
              <MagneticButton
                className="h-14 px-8 text-lg shadow-[0_0_40px_8px_rgba(var(--primary),0.3)] hover:shadow-[0_0_60px_12px_rgba(var(--primary),0.5)]"
                onClick={() => setAuthOpen(true)}
                disabled={checking}
                data-testid="hero-cta"
              >
                Sign in to start
                <ArrowRight className="ml-2 size-5" />
              </MagneticButton>
              <span className="text-xs text-white/40 font-mono uppercase tracking-wider">
                Google / Email magic link. No CC required.
              </span>
            </motion.div>
          </div>

          {/* Right: Mock UI (Floating Chat) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg mx-auto lg:ml-auto perspective-[1000px]"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl transform rotate-y-[-12deg] rotate-x-[5deg]"
            >
              {/* Fake Chat bubbles */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 p-4 text-sm text-white/80 leading-relaxed backdrop-blur-sm">
                    I see you have 3 years as a Software Engineer and Superior English. I've calculated your 189 points score. You're currently sitting at <strong>90 points</strong>. Ready to draft your ACS skills assessment?
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="size-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                    <div className="size-4 rounded-full bg-white/40" />
                  </div>
                  <div className="rounded-2xl rounded-tr-sm bg-primary/20 border border-primary/30 p-4 text-sm text-white leading-relaxed backdrop-blur-sm">
                    Yes, let's do it.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 p-4 text-sm text-white/80 w-full backdrop-blur-sm space-y-3">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <FileText className="size-4 text-primary" /> RPL Draft Generated
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "0%" }} 
                        animate={{ width: "100%" }} 
                        transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
                        className="h-full bg-primary" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          
        </div>
      </section>

      {/* ── Bento Grid Section ── */}
      <section className="relative w-full max-w-7xl px-6 pb-32 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Card 1 */}
          <SpotlightCard className="md:col-span-2 group flex flex-col justify-between">
            <div className="mb-12">
              <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Calculator className="size-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-3">Live Points Calculation</h3>
              <p className="text-white/60 leading-relaxed max-w-md">
                Know exactly where you stand. Our engine recalculates your 189, 190, and 491 points instantly as you adjust your profile parameters.
              </p>
            </div>
            {/* Visual element */}
            <div className="h-32 w-full rounded-xl border border-white/5 bg-gradient-to-t from-white/5 to-transparent relative overflow-hidden flex items-end p-4">
              <div className="flex items-end gap-2 w-full h-full opacity-60">
                <div className="w-1/4 bg-white/20 rounded-t-sm h-[40%]" />
                <div className="w-1/4 bg-white/40 rounded-t-sm h-[60%]" />
                <div className="w-1/4 bg-white/60 rounded-t-sm h-[80%]" />
                <div className="w-1/4 bg-primary rounded-t-sm h-[100%] relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-primary">90pt</div>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2 */}
          <SpotlightCard className="md:col-span-1 group flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Bot className="size-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-3">DHA Rules, Decoded</h3>
              <p className="text-white/60 leading-relaxed">
                Trained on the latest Department of Home Affairs guidelines. Stop reading dense 100-page PDFs. Just ask.
              </p>
            </div>
          </SpotlightCard>

          {/* Card 3 */}
          <SpotlightCard className="md:col-span-1 group flex flex-col justify-between">
             <div>
              <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-500">
                <FileText className="size-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-3">AI-Powered Drafts</h3>
              <p className="text-white/60 leading-relaxed">
                Generate RPLs, EOIs, and work reference letters formatted perfectly for your assessing authority.
              </p>
            </div>
          </SpotlightCard>

          {/* Card 4 */}
          <SpotlightCard className="md:col-span-2 group flex flex-col justify-between">
            <div className="mb-12">
              <div className="size-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-6 group-hover:scale-110 transition-transform duration-500">
                <MapPin className="size-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-3">State Sponsorships Demystified</h3>
              <p className="text-white/60 leading-relaxed max-w-md">
                Every state has different criteria. Imminash automatically filters the noise and shows you the best states to target based on your exact occupation code and points.
              </p>
            </div>
          </SpotlightCard>

        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-white/10 px-6 py-12 z-10 bg-black">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <span className="font-display text-2xl italic tracking-tight text-white/90">
              imminash
            </span>
          </div>
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
            <div className="size-1.5 rounded-full bg-primary/60" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
          </div>
          <p className="mx-auto max-w-lg text-center text-xs leading-relaxed text-white/40">
            Imminash provides general information only and does not constitute
            migration advice. It does not guarantee visa or assessment outcomes.
            Always consult a registered migration agent (MARA) for professional advice.
          </p>
          <p className="mt-6 text-center text-xs font-mono uppercase text-white/30 tracking-widest">
            &copy; {new Date().getFullYear()} Imminash. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}

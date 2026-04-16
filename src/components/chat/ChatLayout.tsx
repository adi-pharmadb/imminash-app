"use client";

/**
 * ChatLayout — three-panel client shell for the unified chat experience.
 *
 * Left:   JourneyStepper (pure projection of phase + profile)
 * Center: ChatPanel (streams /api/chat, applies final state event)
 * Right:  LiveSummaryPanel (pure projection of points/matches/docs)
 *
 * Drives all state from the ProjectedConversation returned by the server
 * on initial load, then updates it whenever the chat stream emits a final
 * {type:'state'} event.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectedConversation } from "@/lib/conversation-state";
import { AppNav } from "@/components/nav/AppNav";
import { BottomSheet } from "./BottomSheet";
import { JourneyStepper } from "./JourneyStepper";
import { LiveSummaryPanel } from "./LiveSummaryPanel";
import { ChatPanel } from "./ChatPanel";

interface ChatLayoutProps {
  initialProjection: ProjectedConversation;
  paidFlag: boolean;
}

export function ChatLayout({ initialProjection, paidFlag }: ChatLayoutProps) {
  const router = useRouter();
  const [projection, setProjection] = useState<ProjectedConversation>(initialProjection);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [shouldKickoff, setShouldKickoff] = useState(false);
  const [mobileLeftSheet, setMobileLeftSheet] = useState(false);
  const [mobileRightSheet, setMobileRightSheet] = useState(false);
  const kickedOffRef = useRef(false);

  // Detect mobile (same breakpoint as lg: in tailwind = 1024px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Restore panel visibility from localStorage on mount.
  useEffect(() => {
    const l = localStorage.getItem("imminash_chat_left_panel");
    const r = localStorage.getItem("imminash_chat_right_panel");
    if (l !== null) setLeftOpen(l === "1");
    if (r !== null) setRightOpen(r === "1");
  }, []);

  const toggleLeft = useCallback(() => {
    if (isMobile) {
      setMobileLeftSheet((v) => !v);
      return;
    }
    setLeftOpen((v) => {
      const next = !v;
      localStorage.setItem("imminash_chat_left_panel", next ? "1" : "0");
      return next;
    });
  }, [isMobile]);
  const toggleRight = useCallback(() => {
    if (isMobile) {
      setMobileRightSheet((v) => !v);
      return;
    }
    setRightOpen((v) => {
      const next = !v;
      localStorage.setItem("imminash_chat_right_panel", next ? "1" : "0");
      return next;
    });
  }, [isMobile]);

  const handleStateUpdate = useCallback((next: ProjectedConversation) => {
    setProjection(next);
  }, []);

  // Paid return flow: poll conversation until status='paid', then signal
  // ChatPanel to fire a hidden __continue__ (which uses the normal streaming
  // UI so the user sees a loading bubble + streamed Phase 2 greeting).
  useEffect(() => {
    if (!paidFlag) return;
    if (kickedOffRef.current) return;
    if (projection.phase === "phase2" || projection.phase === "done") return;

    let cancelled = false;
    let attempts = 0;

    async function pollUntilPaid() {
      while (!cancelled && attempts < 30) {
        attempts += 1;
        try {
          const res = await fetch(`/api/conversations/${projection.id}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const row = await res.json();
            if (row.status === "paid" || row.status === "phase2") {
              if (!kickedOffRef.current) {
                kickedOffRef.current = true;
                router.replace("/chat");
                setShouldKickoff(true);
              }
              return;
            }
          }
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    pollUntilPaid();
    return () => {
      cancelled = true;
    };
  }, [paidFlag, projection.id, projection.phase, router]);

  const isPremium =
    projection.phase === "paid" ||
    projection.phase === "phase2" ||
    projection.phase === "done" ||
    Boolean(projection.paidAt);

  // On mobile, the toggles open sheets; desktop panel-open state is irrelevant.
  const navLeftOpen = isMobile ? mobileLeftSheet : leftOpen;
  const navRightOpen = isMobile ? mobileRightSheet : rightOpen;

  return (
    <div
      className={`flex h-[100dvh] w-full flex-col bg-background ${
        isPremium ? "premium" : ""
      }`}
      data-testid="chat-layout"
      data-premium={isPremium ? "true" : "false"}
    >
      <AppNav
        leftPanelOpen={navLeftOpen}
        rightPanelOpen={navRightOpen}
        onToggleLeft={toggleLeft}
        onToggleRight={toggleRight}
      />
      <div className="flex min-h-0 flex-1">
        {/* Left: Journey stepper */}
        {leftOpen && (
          <aside className="hidden w-64 shrink-0 border-r border-border/40 lg:flex lg:flex-col">
            <JourneyStepper projection={projection} />
          </aside>
        )}

        {/* Center: Chat */}
        <main
          className={`flex min-w-0 flex-1 flex-col ${
            isPremium ? "premium-canvas" : ""
          }`}
        >
          <ChatPanel
            projection={projection}
            onStateUpdate={handleStateUpdate}
            kickoffContinue={shouldKickoff}
            onKickoffDone={() => setShouldKickoff(false)}
          />
        </main>

        {/* Right: Live summary / Application Pack (in premium mode) */}
        {rightOpen && (
          <aside
            className={`hidden shrink-0 border-l border-border/40 lg:flex lg:flex-col ${
              isPremium ? "lg:w-[26rem] xl:w-[28rem]" : "w-80"
            }`}
          >
            <LiveSummaryPanel projection={projection} />
          </aside>
        )}
      </div>

      {/* Mobile bottom sheets (hidden on lg+) */}
      {isMobile && (
        <>
          <BottomSheet
            open={mobileLeftSheet}
            onClose={() => setMobileLeftSheet(false)}
            title="Progress & profile"
          >
            <JourneyStepper projection={projection} />
          </BottomSheet>
          <BottomSheet
            open={mobileRightSheet}
            onClose={() => setMobileRightSheet(false)}
            title={isPremium ? "Your application pack" : "Summary"}
            heightFraction={0.92}
          >
            <LiveSummaryPanel projection={projection} />
          </BottomSheet>
        </>
      )}
    </div>
  );
}

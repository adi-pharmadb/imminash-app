"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

interface PointsCounterProps {
  points: number;
  visible: boolean;
}

/**
 * Live points counter displayed in the stepper header.
 * Animates the number on change and shows a popup for point increases.
 * Styled with amber glow and editorial number display.
 */
export function PointsCounter({ points, visible }: PointsCounterProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [popup, setPopup] = useState<{ amount: number; key: string } | null>(null);
  const prevPoints = useRef(points);

  useEffect(() => {
    const prev = prevPoints.current;
    const diff = points - prev;

    if (diff > 0 && prev > 0) {
      setPopup({ amount: diff, key: `${Date.now()}` });
      const timer = setTimeout(() => setPopup(null), 1200);
      return () => clearTimeout(timer);
    }

    prevPoints.current = points;
  }, [points]);

  // Animate the counter value
  useEffect(() => {
    if (displayPoints === points) return;

    const step = points > displayPoints ? 1 : -1;
    const duration = 400;
    const steps = Math.abs(points - displayPoints);
    const interval = Math.max(duration / steps, 16);

    const timer = setInterval(() => {
      setDisplayPoints((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= points) || (step < 0 && next <= points)) {
          clearInterval(timer);
          return points;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div className="relative flex items-center gap-2 rounded-full glass-card px-3.5 py-1.5 glow-amber">
      <Zap className="size-3.5 text-primary" />
      <span className="text-sm font-bold tabular-nums tracking-wide text-primary">
        {displayPoints}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        pts
      </span>
      {popup && (
        <span
          key={popup.key}
          className="absolute -top-6 right-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          data-testid="points-popup"
        >
          +{popup.amount}
        </span>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className, ...props }: SpotlightCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

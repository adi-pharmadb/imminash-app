"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { EdgeCaseWarning as EdgeCaseWarningType } from "@/lib/visa-pathway-engine";

interface EdgeCaseWarningProps {
  warnings: EdgeCaseWarningType[];
}

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; Icon: typeof AlertTriangle }
> = {
  critical: {
    color: "oklch(0.65 0.2 25)",
    bg: "oklch(0.65 0.2 25 / 0.08)",
    border: "oklch(0.65 0.2 25 / 0.3)",
    Icon: AlertCircle,
  },
  warning: {
    color: "oklch(0.62 0.17 250)",
    bg: "oklch(0.62 0.17 250 / 0.08)",
    border: "oklch(0.62 0.17 250 / 0.3)",
    Icon: AlertTriangle,
  },
  info: {
    color: "oklch(0.65 0.15 250)",
    bg: "oklch(0.65 0.15 250 / 0.08)",
    border: "oklch(0.65 0.15 250 / 0.3)",
    Icon: Info,
  },
};

/**
 * Renders warning banners for edge cases (age, visa expiry, low points, etc.)
 * with severity-based styling: critical = red, warning = amber, info = blue.
 */
export function EdgeCaseWarning({ warnings }: EdgeCaseWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="edge-case-warnings">
      {warnings.map((warning, i) => {
        const config = SEVERITY_CONFIG[warning.severity] ?? SEVERITY_CONFIG.info;
        const { color, bg, border, Icon } = config;

        return (
          <div
            key={`${warning.type}-${i}`}
            className="rounded-xl px-4 py-3 space-y-1.5"
            style={{
              background: bg,
              border: `1px solid ${border}`,
            }}
            data-testid={`warning-${warning.severity}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0" style={{ color }} />
              <p className="text-sm font-semibold" style={{ color }}>
                {warning.message}
              </p>
            </div>
            <p className="text-xs text-muted-foreground pl-6.5 leading-relaxed" style={{ paddingLeft: "1.625rem" }}>
              {warning.action}
            </p>
          </div>
        );
      })}
    </div>
  );
}

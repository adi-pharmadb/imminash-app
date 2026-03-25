"use client";

import { CheckCircle, XCircle, MinusCircle, MapPin } from "lucide-react";
import type { StateEligibility } from "@/lib/state-nominations";

interface StateAvailabilityTableProps {
  eligibility: StateEligibility[];
  occupationTitle: string;
}

function StatusDot({ status }: { status: boolean | "closed" }) {
  if (status === "closed") {
    return (
      <span
        className="flex items-center gap-1 text-xs"
        style={{ color: "oklch(0.60 0.02 260)" }}
        data-testid="status-closed"
      >
        <MinusCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">N/A</span>
      </span>
    );
  }
  if (status) {
    return (
      <span
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "oklch(0.72 0.17 155)" }}
        data-testid="status-open"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Open</span>
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-xs"
      style={{ color: "oklch(0.65 0.2 25)" }}
      data-testid="status-not-available"
    >
      <XCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Closed</span>
    </span>
  );
}

/**
 * State-by-state availability grid for 190/491 visa nomination.
 * Responsive: table on desktop, stacked cards on mobile.
 */
export function StateAvailabilityTable({
  eligibility,
  occupationTitle,
}: StateAvailabilityTableProps) {
  if (eligibility.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4" data-testid="state-availability-table">
      <div className="flex items-center gap-2.5">
        <MapPin className="h-5 w-5" style={{ color: "oklch(0.62 0.17 250)" }} />
        <h3 className="font-display text-lg italic text-foreground">
          State Availability
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">
        State nomination status for {occupationTitle}
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <div className="glass-card overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid oklch(0.28 0.015 260 / 0.5)",
                  background: "oklch(0.14 0.01 260 / 0.6)",
                }}
              >
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  State
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  190
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  491
                </th>
              </tr>
            </thead>
            <tbody>
              {eligibility.map((row, i) => (
                <tr
                  key={row.state}
                  style={
                    i < eligibility.length - 1
                      ? { borderBottom: "1px solid oklch(0.24 0.015 260 / 0.3)" }
                      : undefined
                  }
                  className="transition-colors hover:bg-white/[0.02]"
                  data-testid={`state-row-${row.state}`}
                >
                  <td className="px-4 py-2.5 font-semibold text-foreground">
                    {row.state}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusDot status={row.visa_190} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusDot status={row.visa_491} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden space-y-2">
        {eligibility.map((row) => (
          <div
            key={row.state}
            className="rounded-xl p-3 flex items-center justify-between"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--surface-border-subtle)",
            }}
            data-testid={`state-card-${row.state}`}
          >
            <span className="font-semibold text-sm text-foreground">{row.state}</span>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">190</p>
                <StatusDot status={row.visa_190} />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">491</p>
                <StatusDot status={row.visa_491} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

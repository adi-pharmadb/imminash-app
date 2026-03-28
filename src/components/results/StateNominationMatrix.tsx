"use client";

import type { StateEligibility, StateName } from "@/lib/state-nominations";
import { CheckCircle, XCircle, MinusCircle } from "lucide-react";

interface StateNominationMatrixProps {
  eligibility: StateEligibility[];
  highlightedState?: string;
}

function StatusCell({ status }: { status: boolean | "closed" }) {
  if (status === "closed") {
    return (
      <span
        className="flex items-center gap-1 text-xs"
        style={{ color: "oklch(0.60 0.02 260)" }}
        data-status="closed"
      >
        <MinusCircle className="h-3.5 w-3.5" />
        Closed
      </span>
    );
  }
  if (status) {
    return (
      <span
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "oklch(0.72 0.17 155)" }}
        data-status="eligible"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Eligible
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-xs"
      style={{ color: "oklch(0.65 0.2 25)" }}
      data-status="not-eligible"
    >
      <XCircle className="h-3.5 w-3.5" />
      Not eligible
    </span>
  );
}

/**
 * 8 states x 2 visas (190, 491) matrix table.
 */
export function StateNominationMatrix({
  eligibility,
  highlightedState,
}: StateNominationMatrixProps) {
  return (
    <div className="space-y-3" data-testid="state-nomination-matrix">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        State Nomination Eligibility
      </p>
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
                Visa 190
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Visa 491
              </th>
            </tr>
          </thead>
          <tbody>
            {eligibility.map((row, i) => {
              const isHighlighted = highlightedState === row.state;
              return (
              <tr
                key={row.state}
                style={{
                  ...(i < eligibility.length - 1
                    ? { borderBottom: "1px solid oklch(0.24 0.015 260 / 0.3)" }
                    : {}),
                  ...(isHighlighted
                    ? { background: "oklch(0.72 0.17 155 / 0.08)" }
                    : {}),
                }}
                className="transition-colors hover:bg-white/[0.02]"
                data-testid={`state-row-${row.state}`}
              >
                <td className="px-4 py-2.5 font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    {row.state}
                    {isHighlighted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.72 0.17 155)" }}>
                        Best
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusCell status={row.visa_190} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusCell status={row.visa_491} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

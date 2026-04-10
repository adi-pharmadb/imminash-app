"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MatchResult } from "@/types/assessment";
import { getConfidenceColor } from "@/lib/occupation-matching";
import { isACSBody } from "@/lib/workspace-helpers";

interface OccupationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupations: MatchResult[];
  onSelect: (occupation: MatchResult) => void;
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 75) return "Strong Match";
  if (confidence >= 50) return "Medium Match";
  return "Weak Match";
}

/**
 * Modal for selecting which matched occupation to proceed with.
 * Shows ALL occupations. Non-ACS bodies are greyed out with "Coming soon".
 * Pre-selects the highest confidence ACS match. CTO Brief v2 section 4.1
 */
export function OccupationPicker({
  open,
  onOpenChange,
  occupations,
  onSelect,
}: OccupationPickerProps) {
  // Pre-select the best ACS match
  const bestACS = occupations.find(
    (o) => o.assessing_authority && isACSBody(o.assessing_authority),
  );
  const [selected, setSelected] = useState<string | null>(
    bestACS?.anzsco_code || null,
  );

  function handleConfirm() {
    const occ = occupations.find((o) => o.anzsco_code === selected);
    if (occ) onSelect(occ);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-lg" data-testid="occupation-picker">
        <DialogHeader className="space-y-3">
          <DialogTitle className="font-display text-2xl tracking-tight text-foreground">
            Choose your occupation
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Select the occupation you want to prepare your skill assessment for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {occupations.map((occ) => {
            const isSupported =
              occ.assessing_authority && isACSBody(occ.assessing_authority);
            const isSelected = selected === occ.anzsco_code;
            const colors = getConfidenceColor(occ.confidence);

            return (
              <button
                key={occ.anzsco_code}
                type="button"
                onClick={() => {
                  if (isSupported) setSelected(occ.anzsco_code);
                }}
                disabled={!isSupported}
                className={`w-full rounded-xl p-4 text-left transition-all duration-200 ${
                  !isSupported
                    ? "opacity-50 cursor-not-allowed bg-secondary/20"
                    : isSelected
                      ? "ring-2 ring-primary bg-primary/10"
                      : "bg-secondary/30 hover:bg-secondary/50"
                }`}
                data-testid={`pick-${occ.anzsco_code}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {occ.title}
                      </p>
                      {isSupported && bestACS?.anzsco_code === occ.anzsco_code && (
                        <span
                          className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            background: "color-mix(in oklch, var(--success) 12%, transparent)",
                            color: "var(--success)",
                          }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ANZSCO {occ.anzsco_code}
                      {occ.assessing_authority && (
                        <span className="ml-2">
                          {occ.assessing_authority}
                        </span>
                      )}
                    </p>
                    {!isSupported && (
                      <p
                        className="text-[10px] mt-1 font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        Coming soon - we currently support ACS assessments only
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: isSupported ? colors.bg : "var(--bar-track)",
                      color: isSupported ? colors.text : "oklch(0.50 0.02 260)",
                    }}
                  >
                    {getConfidenceLabel(occ.confidence)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="glow-primary w-full bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 mt-2"
          onClick={handleConfirm}
          disabled={!selected}
          data-testid="confirm-occupation-btn"
        >
          Continue with this occupation
        </Button>
      </DialogContent>
    </Dialog>
  );
}

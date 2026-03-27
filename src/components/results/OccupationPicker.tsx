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

interface OccupationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupations: MatchResult[];
  onSelect: (occupation: MatchResult) => void;
}

/**
 * Modal for selecting which matched occupation to proceed with
 * for document generation / skill assessment preparation.
 */
export function OccupationPicker({
  open,
  onOpenChange,
  occupations,
  onSelect,
}: OccupationPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleConfirm() {
    const occ = occupations.find((o) => o.anzsco_code === selected);
    if (occ) onSelect(occ);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-lg" data-testid="occupation-picker">
        <DialogHeader className="space-y-3">
          <DialogTitle className="font-display text-2xl italic tracking-tight text-foreground">
            Choose your occupation
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Select the occupation you want to prepare your skill assessment for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {occupations.map((occ) => {
            const isSelected = selected === occ.anzsco_code;
            const colors = getConfidenceColor(occ.confidence);

            return (
              <button
                key={occ.anzsco_code}
                type="button"
                onClick={() => setSelected(occ.anzsco_code)}
                className={`w-full rounded-xl p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/10"
                    : "bg-secondary/30 hover:bg-secondary/50"
                }`}
                data-testid={`pick-${occ.anzsco_code}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {occ.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ANZSCO {occ.anzsco_code}
                      {occ.assessing_authority && (
                        <span className="ml-2">
                          {occ.assessing_authority}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                    }}
                  >
                    {occ.confidence}%
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

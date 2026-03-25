"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcPointsSoFar, derivePartnerStatus } from "@/lib/points-calculator";
import type { StepperFormData } from "@/types/assessment";
import { PointsCounter } from "./PointsCounter";
import { StepperPage1 } from "./StepperPage1";
import { StepperPage2 } from "./StepperPage2";
import { StepperPage3 } from "./StepperPage3";
import { StepperPage4 } from "./StepperPage4";
import { StepperPage5 } from "./StepperPage5";
import { StepperPage6 } from "./StepperPage6";
import { StepperPage7 } from "./StepperPage7";

const SESSION_KEY = "imminash_stepper";

interface PageDef {
  id: number;
  /** Returns false if the page should be skipped given current data. */
  condition?: (data: Partial<StepperFormData>) => boolean;
  skippable?: boolean;
  /** Returns true if all required fields for this page are filled. */
  isValid: (data: Partial<StepperFormData>) => boolean;
}

const PAGE_DEFS: PageDef[] = [
  {
    id: 1,
    isValid: (d) =>
      !!d.firstName?.trim() &&
      d.age !== undefined &&
      d.age > 0 &&
      !!d.visaStatus?.trim() &&
      !!d.visaExpiry?.trim(),
  },
  {
    id: 2,
    isValid: (d) =>
      !!d.educationLevel?.trim() &&
      !!d.fieldOfStudy?.trim() &&
      !!d.countryOfEducation?.trim(),
  },
  {
    id: 3,
    skippable: true,
    isValid: () => true,
  },
  {
    id: 4,
    isValid: (d) => {
      if (!d.workingSkilled?.trim()) return false;
      // If working/was working, need job title and experience fields
      if (d.workingSkilled === "Yes" || d.workingSkilled === "Past") {
        return (
          !!d.jobTitle?.trim() &&
          !!d.australianExperience?.trim() &&
          !!d.experience?.trim()
        );
      }
      // "Not yet" still needs job title
      return !!d.jobTitle?.trim();
    },
  },
  {
    id: 5,
    condition: (d) => d.workingSkilled === "Yes" || d.workingSkilled === "Past",
    isValid: (d) => (d.jobDuties?.trim().length ?? 0) >= 50,
  },
  {
    id: 6,
    isValid: (d) => !!d.englishScore?.trim() && !!d.naatiCcl?.trim(),
  },
  {
    id: 7,
    isValid: (d) => {
      if (!d.professionalYear?.trim() || !d.relationshipStatus?.trim()) return false;
      if (d.relationshipStatus === "Partner" && !d.partnerSkills?.trim()) return false;
      return true;
    },
  },
];

function loadFromSession(): Partial<StepperFormData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToSession(data: Partial<StepperFormData>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // Silently fail if sessionStorage is unavailable.
  }
}

interface StepperFlowProps {
  onComplete: (data: Partial<StepperFormData>) => void;
}

export function StepperFlow({ onComplete }: StepperFlowProps) {
  const [data, setData] = useState<Partial<StepperFormData>>(loadFromSession);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Active pages (accounting for conditional page skipping)
  const activePages = useMemo(
    () => PAGE_DEFS.filter((p) => !p.condition || p.condition(data)),
    [data],
  );

  const currentPage = activePages[currentIndex];
  const totalPages = activePages.length;

  // Points calculation
  const points = useMemo(() => calcPointsSoFar(data), [data]);
  const showPoints = currentIndex >= 1;

  // Validation for current page
  const isValid = currentPage ? currentPage.isValid(data) : false;

  const handleChange = useCallback(
    (key: keyof StepperFormData, value: string | number) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };

        // Derive partnerStatus when relationship or partner skills change
        if (key === "relationshipStatus" || key === "partnerSkills") {
          const rel = key === "relationshipStatus" ? String(value) : prev.relationshipStatus;
          const skills = key === "partnerSkills" ? String(value) : prev.partnerSkills;
          next.partnerStatus = derivePartnerStatus(rel, skills);

          // Clear partnerSkills when switching to Single
          if (key === "relationshipStatus" && value === "Single") {
            next.partnerSkills = undefined as unknown as string;
          }
        }

        // Clear conditional fields when country of education changes
        if (key === "countryOfEducation" && value === "Overseas") {
          next.australianStudy = undefined as unknown as string;
          next.regionalStudy = undefined as unknown as string;
        }

        // Clear regional study if australian study becomes No
        if (key === "australianStudy" && value === "No") {
          next.regionalStudy = undefined as unknown as string;
        }

        saveToSession(next);
        return next;
      });
    },
    [],
  );

  const handleNext = () => {
    if (currentIndex < totalPages - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(data);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentPage) return null;

  const isLastPage = currentIndex === totalPages - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="stepper-flow">
      {/* Brand header */}
      <header className="relative mx-auto w-full max-w-2xl px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl italic tracking-tight text-foreground">
            imminash
          </span>
          <div className="flex items-center gap-5">
            <PointsCounter points={points} visible={showPoints} />
            <span
              className="text-xs font-medium tracking-widest uppercase text-muted-foreground"
              data-testid="page-indicator"
            >
              {currentIndex + 1} of {totalPages}
            </span>
          </div>
        </div>
      </header>

      {/* Editorial progress line */}
      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-2" data-testid="progress-bar">
        <div className="relative flex items-center gap-2">
          {activePages.map((_, i) => (
            <div key={i} className="relative h-0.5 flex-1 overflow-hidden rounded-full">
              {/* Track */}
              <div className="absolute inset-0 rounded-full bg-muted" />
              {/* Fill */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                  i < currentIndex
                    ? "w-full bg-primary"
                    : i === currentIndex
                      ? "w-full bg-primary"
                      : "w-0 bg-primary"
                }`}
              />
            </div>
          ))}
          {/* Glowing dot on current segment */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
            style={{
              left: `${((currentIndex + 1) / totalPages) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="h-2 w-2 rounded-full bg-primary glow-amber" />
          </div>
        </div>
      </div>

      {/* Page content area - spacious and focused */}
      <div className="flex flex-1 items-start justify-center px-6 pt-8 pb-28">
        <div className="w-full max-w-md">
          <div className="animate-reveal-up">
            {currentPage.id === 1 && <StepperPage1 data={data} onChange={handleChange} />}
            {currentPage.id === 2 && <StepperPage2 data={data} onChange={handleChange} />}
            {currentPage.id === 3 && <StepperPage3 data={data} onChange={handleChange} />}
            {currentPage.id === 4 && <StepperPage4 data={data} onChange={handleChange} />}
            {currentPage.id === 5 && <StepperPage5 data={data} onChange={handleChange} />}
            {currentPage.id === 6 && <StepperPage6 data={data} onChange={handleChange} />}
            {currentPage.id === 7 && <StepperPage7 data={data} onChange={handleChange} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-10">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>

            <div className="flex items-center gap-4">
              {currentPage.skippable && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentIndex < totalPages - 1) {
                      setCurrentIndex(currentIndex + 1);
                    }
                  }}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Skip this
                </button>
              )}
              <Button
                data-testid="continue-button"
                onClick={handleNext}
                disabled={!isValid && !currentPage.skippable}
                size="lg"
                className="group gap-2 rounded-xl bg-primary px-8 text-primary-foreground shadow-lg glow-amber transition-all hover:shadow-xl disabled:shadow-none disabled:opacity-40"
              >
                <span className="font-semibold">
                  {isLastPage ? "Analyze" : "Continue"}
                </span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Points gap analysis and improvement suggestions.
 * Given a user's current points breakdown and a target, calculates the gap
 * and ranks actionable improvement suggestions.
 */

import type { PointsBreakdown } from "@/types/assessment";

export type Feasibility = "Easy" | "Moderate" | "Hard";

export interface PointsImprovement {
  action: string;
  pointsGain: number;
  feasibility: Feasibility;
  timeframe: string;
  available: boolean;
}

export interface GapAnalysis {
  currentPoints: number;
  targetPoints: number;
  gap: number;
  suggestions: PointsImprovement[];
  summary: string;
}

/**
 * Analyze the points gap and generate ranked improvement suggestions.
 * Only suggests improvements the user has not already maxed out.
 *
 * @param breakdown - current points breakdown from estimatePoints()
 * @param targetPoints - points needed for the target pathway
 * @param assessingAuthority - optional assessing body (e.g. "ACS") for Professional Year eligibility
 */
export function analyzePointsGap(
  breakdown: PointsBreakdown,
  targetPoints: number,
  assessingAuthority?: string | null,
): GapAnalysis {
  const gap = Math.max(0, targetPoints - breakdown.total);
  const suggestions: PointsImprovement[] = [];

  // English improvement: Competent (0) -> Proficient (10) or Proficient (10) -> Superior (20)
  if (breakdown.english === 0) {
    suggestions.push({
      action: "Improve English to Proficient (PTE 65+ / IELTS 7+)",
      pointsGain: 10,
      feasibility: "Moderate",
      timeframe: "1-3 months preparation",
      available: true,
    });
    suggestions.push({
      action: "Improve English to Superior (PTE 79+ / IELTS 8+)",
      pointsGain: 20,
      feasibility: "Hard",
      timeframe: "3-6 months preparation",
      available: true,
    });
  } else if (breakdown.english === 10) {
    suggestions.push({
      action: "Improve English to Superior (PTE 79+ / IELTS 8+)",
      pointsGain: 10,
      feasibility: "Moderate",
      timeframe: "1-3 months preparation",
      available: true,
    });
  }

  // NAATI/CCL (+5)
  if (breakdown.naatiCcl === 0) {
    suggestions.push({
      action: "Complete NAATI/CCL credentialed community language test",
      pointsGain: 5,
      feasibility: "Moderate",
      timeframe: "2-4 months preparation",
      available: true,
    });
  }

  // Professional Year (+5) - only for ACS (IT), CPA/CA (Accounting), Engineers Australia
  const pyEligibleBodies = ["ACS", "CPA Australia", "Chartered Accountants ANZ", "Engineers Australia"];
  const pyAvailable =
    breakdown.professionalYear === 0 &&
    assessingAuthority != null &&
    pyEligibleBodies.some((b) => assessingAuthority.toLowerCase().includes(b.toLowerCase()));

  if (breakdown.professionalYear === 0) {
    suggestions.push({
      action: "Complete a Professional Year program",
      pointsGain: 5,
      feasibility: "Moderate",
      timeframe: "12 months (44 weeks program)",
      available: pyAvailable,
    });
  }

  // Partner skills (+5 or +10)
  if (breakdown.partner === 0) {
    suggestions.push({
      action: "Partner completes skills assessment in a nominated occupation",
      pointsGain: 10,
      feasibility: "Hard",
      timeframe: "3-6 months",
      available: true,
    });
    suggestions.push({
      action: "Partner achieves Competent English (IELTS 6 / PTE 50+)",
      pointsGain: 5,
      feasibility: "Moderate",
      timeframe: "1-3 months",
      available: true,
    });
  } else if (breakdown.partner === 5) {
    suggestions.push({
      action: "Partner completes skills assessment in a nominated occupation",
      pointsGain: 5,
      feasibility: "Hard",
      timeframe: "3-6 months",
      available: true,
    });
  }

  // More Australian work experience (next bracket)
  if (breakdown.australianExperience < 20) {
    const nextBracket = getNextExperienceBracket(breakdown.australianExperience);
    if (nextBracket) {
      suggestions.push({
        action: `Gain more Australian work experience (${nextBracket.yearsNeeded})`,
        pointsGain: nextBracket.pointsGain,
        feasibility: "Hard",
        timeframe: nextBracket.timeframe,
        available: true,
      });
    }
  }

  // Sort: available first, then by points gain descending, then feasibility
  const feasibilityOrder: Record<Feasibility, number> = { Easy: 0, Moderate: 1, Hard: 2 };
  suggestions.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.pointsGain !== b.pointsGain) return b.pointsGain - a.pointsGain;
    return feasibilityOrder[a.feasibility] - feasibilityOrder[b.feasibility];
  });

  const summary = formatGapSummary(gap, suggestions);

  return { currentPoints: breakdown.total, targetPoints, gap, suggestions, summary };
}

/**
 * Get the next Australian experience points bracket info.
 */
function getNextExperienceBracket(
  currentPoints: number,
): { pointsGain: number; yearsNeeded: string; timeframe: string } | null {
  if (currentPoints === 0) return { pointsGain: 5, yearsNeeded: "reach 1-3 years", timeframe: "1-3 years" };
  if (currentPoints === 5) return { pointsGain: 5, yearsNeeded: "reach 3-5 years", timeframe: "1-2 years" };
  if (currentPoints === 10) return { pointsGain: 5, yearsNeeded: "reach 5-8 years", timeframe: "1-3 years" };
  if (currentPoints === 15) return { pointsGain: 5, yearsNeeded: "reach 8+ years", timeframe: "1-3 years" };
  return null;
}

/**
 * Generate a human-readable gap summary with the top 3 suggestions.
 */
export function formatGapSummary(gap: number, suggestions: PointsImprovement[]): string {
  if (gap === 0) return "You meet the points requirement for this pathway.";

  const availableSuggestions = suggestions.filter((s) => s.available);
  const top3 = availableSuggestions.slice(0, 3);

  if (top3.length === 0) {
    return `You need ${gap} more points, but no additional improvement options are available based on your current profile.`;
  }

  const actionList = top3
    .map((s) => `${s.action} (+${s.pointsGain} points, ${s.timeframe})`)
    .join("; ");

  return `You need ${gap} more points. Top actions: ${actionList}.`;
}

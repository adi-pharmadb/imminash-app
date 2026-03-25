/**
 * Visa Pathway Decision Engine.
 * Evaluates 189, 190, 491, and employer-sponsored pathways for each
 * matched occupation and selects the recommended pathway.
 */

import type { MatchResult, PointsBreakdown, UserProfile } from "@/types/assessment";
import type { StateNomination } from "@/types/database";
import type { StateEligibility } from "@/lib/state-nominations";
import { getStateEligibility } from "@/lib/state-nominations";
import { getEmployerEligibility, type EmployerEligibility } from "@/lib/employer-eligibility";
import { parseExperienceYears } from "@/lib/points-calculator";
import { getPrimaryList, type OccupationList } from "@/lib/pathway-signals";
import { getProcessingTime, getTimelineToPR, type ProcessingTimeInfo, type TimelineToPR } from "@/lib/processing-times";
import { analyzePointsGap, type GapAnalysis } from "@/lib/points-gap";

/** Rating for a specific visa pathway. */
export type PathwayRating = "Strong" | "Competitive" | "Gap Exists" | "Not Available";

/** Confidence level for the recommended pathway. */
export type ConfidenceLevel = "High" | "Medium" | "Low";

/** Result of evaluating a single visa pathway for one occupation. */
export interface PathwayResult {
  visa: string;
  visaName: string;
  rating: PathwayRating;
  reasoning: string;
  userPoints: number;
  effectivePoints: number;
  bonusPoints: number;
  cutoff: number | null;
  gapAnalysis: GapAnalysis | null;
  stateEligibility: StateEligibility[];
  processingTime: ProcessingTimeInfo;
  timelineToPR: TimelineToPR;
  isProvisional: boolean;
  nextSteps: string[];
}

/** Employer-sponsored pathway result. */
export interface EmployerPathwayResult {
  visa: string;
  visaName: string;
  eligibility: EmployerEligibility;
  reasoning: string;
  processingTime: ProcessingTimeInfo;
  timelineToPR: TimelineToPR;
  nextSteps: string[];
}

/** The recommended pathway with reasoning. */
export interface RecommendedPathway {
  visa: string;
  visaName: string;
  reasoning: string;
  confidence: ConfidenceLevel;
}

/** Edge case warning. */
export interface EdgeCaseWarning {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  action: string;
}

/** Full pathway analysis for one occupation. */
export interface PathwayAnalysis {
  occupation: MatchResult;
  pathways: PathwayResult[];
  employerPathway: EmployerPathwayResult;
  recommended: RecommendedPathway;
  warnings: EdgeCaseWarning[];
}

/** Default 189 cutoff when no invitation round data is available. */
const DEFAULT_189_CUTOFF = 65;

/**
 * Evaluate Subclass 189 (Skilled Independent) eligibility.
 * Eligible only if occupation is on MLTSSL.
 */
export function evaluate189(
  userPoints: number,
  breakdown: PointsBreakdown,
  occupation: MatchResult,
  list: OccupationList,
  assessingAuthority?: string | null,
): PathwayResult {
  const cutoff = occupation.min_189_points ?? DEFAULT_189_CUTOFF;
  const processingTime = getProcessingTime("189");
  const timelineToPR = getTimelineToPR("189");

  if (list !== "MLTSSL") {
    return {
      visa: "189",
      visaName: "Subclass 189 - Skilled Independent",
      rating: "Not Available",
      reasoning: "Your occupation is not on the MLTSSL. Subclass 189 requires an MLTSSL-listed occupation.",
      userPoints,
      effectivePoints: userPoints,
      bonusPoints: 0,
      cutoff: null,
      gapAnalysis: null,
      stateEligibility: [],
      processingTime,
      timelineToPR,
      isProvisional: false,
      nextSteps: [],
    };
  }

  let rating: PathwayRating;
  let reasoning: string;
  const nextSteps: string[] = [];

  if (userPoints >= cutoff) {
    rating = "Strong";
    reasoning = `Your ${userPoints} points meet or exceed the latest 189 invitation cutoff of ${cutoff} points for ${occupation.title}.`;
    nextSteps.push("Lodge an Expression of Interest (EOI) via SkillSelect");
    nextSteps.push("Prepare documents for skills assessment");
    nextSteps.push("Await invitation to apply (typically within 1-2 rounds)");
  } else if (cutoff - userPoints <= 5) {
    rating = "Competitive";
    reasoning = `Your ${userPoints} points are within 5 of the ${cutoff}-point cutoff. You are close to receiving an invitation.`;
    nextSteps.push("Lodge an EOI now to secure your place in the queue");
    nextSteps.push("Consider improving your points score (see suggestions below)");
    nextSteps.push("Monitor invitation rounds for changes in cutoff");
  } else {
    rating = "Gap Exists";
    reasoning = `You need ${cutoff - userPoints} more points to reach the ${cutoff}-point cutoff for 189.`;
    nextSteps.push("Review points improvement suggestions below");
    nextSteps.push("Consider 190 or 491 pathways which include bonus points");
    nextSteps.push("Lodge an EOI to track rounds while improving your score");
  }

  const gapAnalysis =
    userPoints < cutoff ? analyzePointsGap(breakdown, cutoff, assessingAuthority) : null;

  return {
    visa: "189",
    visaName: "Subclass 189 - Skilled Independent",
    rating,
    reasoning,
    userPoints,
    effectivePoints: userPoints,
    bonusPoints: 0,
    cutoff,
    gapAnalysis,
    stateEligibility: [],
    processingTime,
    timelineToPR,
    isProvisional: false,
    nextSteps,
  };
}

/**
 * Evaluate Subclass 190 (State Nominated) eligibility.
 * Eligible if occupation is on MLTSSL or STSOL. Adds +5 state nomination bonus.
 */
export function evaluate190(
  userPoints: number,
  breakdown: PointsBreakdown,
  occupation: MatchResult,
  list: OccupationList,
  stateNominations: StateNomination[],
  assessingAuthority?: string | null,
): PathwayResult {
  const processingTime = getProcessingTime("190");
  const timelineToPR = getTimelineToPR("190");
  const bonusPoints = 5;
  const effectivePoints = userPoints + bonusPoints;

  if (list !== "MLTSSL" && list !== "STSOL") {
    return {
      visa: "190",
      visaName: "Subclass 190 - State Nominated",
      rating: "Not Available",
      reasoning: "Your occupation is not on the MLTSSL or STSOL. Subclass 190 requires one of these lists.",
      userPoints,
      effectivePoints,
      bonusPoints,
      cutoff: null,
      gapAnalysis: null,
      stateEligibility: [],
      processingTime,
      timelineToPR,
      isProvisional: false,
      nextSteps: [],
    };
  }

  const stateEligibility = getStateEligibility(
    occupation.anzsco_code,
    occupation.title,
    list,
    stateNominations,
  );

  const invitingStates = stateEligibility.filter((s) => s.visa_190 === true);
  const cutoff = DEFAULT_189_CUTOFF;

  let rating: PathwayRating;
  let reasoning: string;
  const nextSteps: string[] = [];

  if (effectivePoints >= cutoff && invitingStates.length > 0) {
    rating = "Strong";
    reasoning = `With the +5 state nomination bonus, your effective ${effectivePoints} points meet the threshold. ${invitingStates.length} state(s) currently nominate this occupation for 190.`;
    nextSteps.push("Research state nomination requirements for your target state");
    nextSteps.push("Lodge an EOI via SkillSelect selecting 190");
    nextSteps.push("Apply for state nomination from your preferred state");
    nextSteps.push("Note: You must live in the nominating state for 2 years post-grant");
  } else if (effectivePoints >= cutoff && invitingStates.length === 0) {
    rating = "Competitive";
    reasoning = `Your effective ${effectivePoints} points (including +5 bonus) meet the threshold, but no states are currently inviting for this occupation under 190.`;
    nextSteps.push("Monitor state nomination lists for openings");
    nextSteps.push("Consider 491 regional pathway as an alternative");
  } else {
    rating = "Gap Exists";
    reasoning = `Even with the +5 state nomination bonus, your effective ${effectivePoints} points fall short of the ${cutoff}-point threshold.`;
    nextSteps.push("Review points improvement suggestions below");
    nextSteps.push("Consider 491 pathway which adds +15 bonus points");
  }

  const gapAnalysis =
    effectivePoints < cutoff ? analyzePointsGap(breakdown, cutoff - bonusPoints, assessingAuthority) : null;

  return {
    visa: "190",
    visaName: "Subclass 190 - State Nominated",
    rating,
    reasoning,
    userPoints,
    effectivePoints,
    bonusPoints,
    cutoff,
    gapAnalysis,
    stateEligibility,
    processingTime,
    timelineToPR,
    isProvisional: false,
    nextSteps,
  };
}

/**
 * Evaluate Subclass 491 (Skilled Work Regional) eligibility.
 * Eligible if occupation is on MLTSSL, STSOL, or ROL. Adds +15 regional nomination bonus.
 */
export function evaluate491(
  userPoints: number,
  breakdown: PointsBreakdown,
  occupation: MatchResult,
  list: OccupationList,
  stateNominations: StateNomination[],
  assessingAuthority?: string | null,
): PathwayResult {
  const processingTime = getProcessingTime("491");
  const timelineToPR = getTimelineToPR("491");
  const bonusPoints = 15;
  const effectivePoints = userPoints + bonusPoints;

  if (list === "CSOL") {
    return {
      visa: "491",
      visaName: "Subclass 491 - Skilled Work Regional (Provisional)",
      rating: "Not Available",
      reasoning: "Your occupation is only on the CSOL. Subclass 491 requires MLTSSL, STSOL, or ROL listing.",
      userPoints,
      effectivePoints,
      bonusPoints,
      cutoff: null,
      gapAnalysis: null,
      stateEligibility: [],
      processingTime,
      timelineToPR,
      isProvisional: true,
      nextSteps: [],
    };
  }

  const stateEligibility = getStateEligibility(
    occupation.anzsco_code,
    occupation.title,
    list,
    stateNominations,
  );

  const invitingStates = stateEligibility.filter((s) => s.visa_491 === true);
  const cutoff = DEFAULT_189_CUTOFF;

  let rating: PathwayRating;
  let reasoning: string;
  const nextSteps: string[] = [];

  if (effectivePoints >= cutoff && invitingStates.length > 0) {
    rating = "Strong";
    reasoning = `With the +15 regional bonus, your effective ${effectivePoints} points comfortably meet the threshold. ${invitingStates.length} state(s) nominate for 491.`;
    nextSteps.push("Research regional areas and state 491 nomination requirements");
    nextSteps.push("Lodge an EOI via SkillSelect selecting 491");
    nextSteps.push("Apply for state/territory nomination");
    nextSteps.push("Note: 491 is a provisional visa (5 years). Eligible for 191 PR after 3 years in a regional area.");
  } else if (effectivePoints >= cutoff) {
    rating = "Competitive";
    reasoning = `Your effective ${effectivePoints} points (with +15 bonus) meet the threshold, but limited states are currently nominating for 491.`;
    nextSteps.push("Monitor state nomination lists for 491 openings");
    nextSteps.push("Consider employer-sponsored regional pathways");
  } else {
    rating = "Gap Exists";
    reasoning = `Even with the +15 regional bonus, your effective ${effectivePoints} points fall short of the ${cutoff}-point threshold.`;
    nextSteps.push("Review points improvement suggestions below");
    nextSteps.push("Consider employer-sponsored pathways as an alternative");
  }

  const gapAnalysis =
    effectivePoints < cutoff ? analyzePointsGap(breakdown, cutoff - bonusPoints, assessingAuthority) : null;

  return {
    visa: "491",
    visaName: "Subclass 491 - Skilled Work Regional (Provisional)",
    rating,
    reasoning,
    userPoints,
    effectivePoints,
    bonusPoints,
    cutoff,
    gapAnalysis,
    stateEligibility,
    processingTime,
    timelineToPR,
    isProvisional: true,
    nextSteps,
  };
}

/**
 * Evaluate employer-sponsored pathways (482/494/186).
 * Reuses the existing getEmployerEligibility() function.
 */
export function evaluateEmployerSponsored(
  occupation: MatchResult,
  list: OccupationList,
  formData: UserProfile,
): EmployerPathwayResult {
  const isMltssl = list === "MLTSSL";
  const isCsol = list === "CSOL" || isMltssl || list === "STSOL";
  const auYears = parseExperienceYears(formData.australianExperience || "0-1");
  const totalYears = auYears + parseExperienceYears(formData.experience || "0-1");

  const eligibility = getEmployerEligibility(isMltssl, isCsol, auYears, totalYears);

  const viable = eligibility.visa_186.eligible || eligibility.visa_482.eligible;
  const reasons: string[] = [];
  const nextSteps: string[] = [];

  if (eligibility.visa_186.eligible) {
    reasons.push("Eligible for 186 Direct Entry (immediate PR).");
    nextSteps.push("Find an employer willing to sponsor under 186 Direct Entry");
    nextSteps.push("Complete skills assessment if not already done");
  }
  if (eligibility.visa_482.eligible) {
    reasons.push("Eligible for 482 Temporary Skill Shortage visa.");
    nextSteps.push("Seek employer sponsorship for a 482 visa");
    nextSteps.push("482 can transition to 186 PR after 2-3 years with the same employer");
  }
  if (!viable) {
    reasons.push("Currently not eligible for employer-sponsored pathways based on your experience and occupation list.");
    nextSteps.push("Gain more Australian work experience");
    nextSteps.push("Consider booking a consultation with a migration agent");
  }

  return {
    visa: "employer",
    visaName: "Employer Sponsored (482/494/186)",
    eligibility,
    reasoning: reasons.join(" "),
    processingTime: getProcessingTime("482"),
    timelineToPR: getTimelineToPR("482"),
    nextSteps,
  };
}

/**
 * Select the recommended pathway based on priority ranking.
 * Priority: 189 Strong > 190 viable > 491 viable > employer > consultation
 */
export function selectRecommendedPathway(
  pathways: PathwayResult[],
  employerPathway: EmployerPathwayResult,
): RecommendedPathway {
  const p189 = pathways.find((p) => p.visa === "189");
  const p190 = pathways.find((p) => p.visa === "190");
  const p491 = pathways.find((p) => p.visa === "491");

  // 189 Strong
  if (p189 && p189.rating === "Strong") {
    return {
      visa: "189",
      visaName: p189.visaName,
      reasoning: "You have strong eligibility for Subclass 189. This is the most direct path to permanent residency with no state obligation.",
      confidence: "High",
    };
  }

  // 190 viable (Strong or Competitive)
  if (p190 && (p190.rating === "Strong" || p190.rating === "Competitive")) {
    const bridgesGap = p189 && p189.rating === "Gap Exists";
    const reasoning = bridgesGap
      ? "While you fall short for 189, the +5 state nomination bonus for 190 bridges the gap. PR on grant with a 2-year state living obligation."
      : "Subclass 190 is your strongest pathway with the +5 state nomination bonus. PR on grant with a 2-year state living obligation.";
    return {
      visa: "190",
      visaName: p190.visaName,
      reasoning,
      confidence: p190.rating === "Strong" ? "High" : "Medium",
    };
  }

  // 491 viable (Strong or Competitive)
  if (p491 && (p491.rating === "Strong" || p491.rating === "Competitive")) {
    return {
      visa: "491",
      visaName: p491.visaName,
      reasoning: "The +15 regional bonus for 491 gives you a strong position. This is a provisional visa leading to PR after 3 years in a regional area.",
      confidence: p491.rating === "Strong" ? "High" : "Medium",
    };
  }

  // Employer sponsored
  const empViable = employerPathway.eligibility.visa_186.eligible || employerPathway.eligibility.visa_482.eligible;
  if (empViable) {
    return {
      visa: "employer",
      visaName: employerPathway.visaName,
      reasoning: "Points-based pathways are limited for your profile. Employer sponsorship is your most viable route to permanent residency.",
      confidence: "Medium",
    };
  }

  // Consultation fallback
  return {
    visa: "consultation",
    visaName: "Professional Consultation",
    reasoning: "Based on your current profile, we recommend booking a consultation with a registered migration agent to explore tailored options.",
    confidence: "Low",
  };
}

/**
 * Detect edge cases that require special warnings.
 */
export function detectEdgeCases(
  userPoints: number,
  formData: UserProfile,
  occupations: MatchResult[],
): EdgeCaseWarning[] {
  const warnings: EdgeCaseWarning[] = [];

  // Points below 65
  if (userPoints < 65) {
    warnings.push({
      type: "low-points",
      severity: "critical",
      message: `Your current points score of ${userPoints} is below the minimum 65 points required for any points-tested visa (189, 190, 491).`,
      action: "Consider employer-sponsored pathways, further study in Australia, or book a consultation with a migration agent.",
    });
  }

  // Age 45+
  if (formData.age >= 45) {
    warnings.push({
      type: "age-ineligible",
      severity: "critical",
      message: "At age 45 or over, you are ineligible for Subclass 189 and 190 visas. Limited options remain.",
      action: "Consider employer-sponsored pathways (no age limit for some streams) or book an urgent consultation with a migration agent.",
    });
  } else if (formData.age >= 40) {
    // Age 40-44
    warnings.push({
      type: "age-urgent",
      severity: "warning",
      message: "Your age points drop significantly in this range, and eligibility ends at 45. Time is critical.",
      action: "Consider lodging your EOI promptly. Your age points will reduce further or reach zero as you approach 45.",
    });
  }

  // STSOL-only occupation
  const stsolOnly = occupations.some((occ) => {
    const list = getOccupationList(occ);
    return list === "STSOL";
  });
  if (stsolOnly) {
    warnings.push({
      type: "stsol-only",
      severity: "warning",
      message: "One or more of your matched occupations is on the STSOL only. Subclass 189 is not available for STSOL occupations.",
      action: "Focus on Subclass 190 and 491 pathways, or explore employer-sponsored options.",
    });
  }

  // ROL-only occupation
  const rolOnly = occupations.some((occ) => {
    const list = getOccupationList(occ);
    return list === "ROL";
  });
  if (rolOnly) {
    warnings.push({
      type: "rol-only",
      severity: "warning",
      message: "One or more of your matched occupations is on the ROL only. Only Subclass 491 (regional) is available.",
      action: "Subclass 491 is your primary points-based option. We strongly recommend consulting a migration agent for alternative strategies.",
    });
  }

  // Visa expiry within 6 months
  if (formData.visaExpiry) {
    const expiryDate = parseVisaExpiry(formData.visaExpiry);
    if (expiryDate) {
      const now = new Date();
      const sixMonths = new Date(now);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      if (expiryDate <= sixMonths) {
        warnings.push({
          type: "visa-expiry",
          severity: "critical",
          message: `Your current visa expires within 6 months (${formData.visaExpiry}). You need to act quickly to maintain lawful status.`,
          action: "Prioritize lodging applications or bridging visa options. Consult a migration agent immediately.",
        });
      }
    }
  }

  return warnings;
}

/**
 * Determine the occupation list from a MatchResult.
 */
function getOccupationList(occupation: MatchResult): OccupationList {
  const listStr = occupation.list?.toUpperCase();
  if (listStr === "MLTSSL") return "MLTSSL";
  if (listStr === "STSOL") return "STSOL";
  if (listStr === "CSOL") return "CSOL";
  if (listStr === "ROL") return "ROL";
  // Fallback: derive from list string if available
  return "CSOL";
}

/**
 * Parse visa expiry string (MM/YYYY format) to a Date.
 */
function parseVisaExpiry(expiry: string): Date | null {
  const parts = expiry.split("/");
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(year)) return null;
  // Last day of the expiry month
  return new Date(year, month, 0);
}

/**
 * Main orchestrator: analyze all pathways for each matched occupation.
 * Returns a full PathwayAnalysis for each occupation.
 */
export function analyzePathways(
  formData: UserProfile,
  occupations: MatchResult[],
  breakdown: PointsBreakdown,
  stateNominations: StateNomination[],
): PathwayAnalysis[] {
  const userPoints = breakdown.total;
  const warnings = detectEdgeCases(userPoints, formData, occupations);

  return occupations.map((occupation) => {
    const list = getOccupationList(occupation);
    const assessingAuthority = occupation.assessing_authority;

    // Skip 189/190 for age 45+
    const pathways: PathwayResult[] = [];

    if (formData.age < 45) {
      pathways.push(evaluate189(userPoints, breakdown, occupation, list, assessingAuthority));
      pathways.push(evaluate190(userPoints, breakdown, occupation, list, stateNominations, assessingAuthority));
    } else {
      // Age 45+: 189 and 190 are not available
      pathways.push({
        visa: "189",
        visaName: "Subclass 189 - Skilled Independent",
        rating: "Not Available",
        reasoning: "Ineligible due to age (45+). Subclass 189 requires applicants to be under 45 at time of invitation.",
        userPoints,
        effectivePoints: userPoints,
        bonusPoints: 0,
        cutoff: null,
        gapAnalysis: null,
        stateEligibility: [],
        processingTime: getProcessingTime("189"),
        timelineToPR: getTimelineToPR("189"),
        isProvisional: false,
        nextSteps: [],
      });
      pathways.push({
        visa: "190",
        visaName: "Subclass 190 - State Nominated",
        rating: "Not Available",
        reasoning: "Ineligible due to age (45+). Subclass 190 requires applicants to be under 45 at time of invitation.",
        userPoints,
        effectivePoints: userPoints + 5,
        bonusPoints: 5,
        cutoff: null,
        gapAnalysis: null,
        stateEligibility: [],
        processingTime: getProcessingTime("190"),
        timelineToPR: getTimelineToPR("190"),
        isProvisional: false,
        nextSteps: [],
      });
    }

    // 491 still possible at 44 (if under 45 at invite), but not at 45+
    if (formData.age < 45) {
      pathways.push(evaluate491(userPoints, breakdown, occupation, list, stateNominations, assessingAuthority));
    } else {
      pathways.push({
        visa: "491",
        visaName: "Subclass 491 - Skilled Work Regional (Provisional)",
        rating: "Not Available",
        reasoning: "Ineligible due to age (45+). Subclass 491 requires applicants to be under 45 at time of invitation.",
        userPoints,
        effectivePoints: userPoints + 15,
        bonusPoints: 15,
        cutoff: null,
        gapAnalysis: null,
        stateEligibility: [],
        processingTime: getProcessingTime("491"),
        timelineToPR: getTimelineToPR("491"),
        isProvisional: true,
        nextSteps: [],
      });
    }

    const employerPathway = evaluateEmployerSponsored(occupation, list, formData);
    const recommended = selectRecommendedPathway(pathways, employerPathway);

    return {
      occupation,
      pathways,
      employerPathway,
      recommended,
      warnings,
    };
  });
}

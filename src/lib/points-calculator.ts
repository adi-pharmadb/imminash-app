/**
 * Points calculator based on official DHA points tables.
 * https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-table
 *
 * Ported from legacy pointsCalculator.ts with identical point values and logic.
 */

import type { PointsBreakdown, UserProfile } from "@/types/assessment";

/** Combined skilled employment cap is 20 (DHA rule: AU + offshore cannot exceed 20). */
export const COMBINED_EXPERIENCE_CAP = 20;

/** Maximum possible points score. */
export const MAX_POINTS = 125;

/** Minimum points required for 189 visa. */
export const MIN_189_POINTS = 65;

function getAgePoints(age: number): number {
  if (age >= 18 && age <= 24) return 25;
  if (age >= 25 && age <= 32) return 30;
  if (age >= 33 && age <= 39) return 25;
  if (age >= 40 && age <= 44) return 15;
  return 0;
}

function getEnglishPoints(score: string): number {
  switch (score) {
    case "Superior":
      return 20;
    case "Proficient":
      return 10;
    case "Competent":
      return 0;
    default:
      return 0;
  }
}

function getAustralianExperiencePoints(experience: string): number {
  switch (experience) {
    case "0-1":
      return 0;
    case "1-3":
      return 5;
    case "3-5":
      return 10;
    case "5-8":
      return 15;
    case "8+":
      return 20;
    default:
      return 0;
  }
}

function getOffshoreExperiencePoints(experience: string): number {
  switch (experience) {
    case "0-1":
      return 0;
    case "1-3":
      return 5;
    case "3-5":
      return 10;
    case "5-8":
      return 15;
    case "8+":
      return 15;
    default:
      return 0;
  }
}

function getEducationPoints(level: string): number {
  switch (level) {
    case "PhD":
      return 20;
    case "Masters":
      return 15;
    case "Bachelor":
      return 15;
    case "Diploma":
      return 10;
    case "Trade":
      return 10;
    default:
      return 0;
  }
}

function getAustralianStudyPoints(completed: string): number {
  return completed === "Yes" ? 5 : 0;
}

function getPartnerPoints(status: string): number {
  switch (status) {
    case "Skilled":
      return 10;
    case "English":
      return 5;
    case "Single":
      return 10;
    default:
      return 0;
  }
}

/**
 * Full points calculation returning a detailed PointsBreakdown.
 * Ported exactly from the legacy estimatePoints() function.
 */
export function estimatePoints(userData: UserProfile): PointsBreakdown {
  const age = getAgePoints(userData.age);
  const english = getEnglishPoints(userData.englishScore);
  const rawAU = getAustralianExperiencePoints(
    userData.australianExperience || "0-1",
  );
  const rawOffshore = getOffshoreExperiencePoints(userData.experience);
  const education = getEducationPoints(userData.educationLevel || "");
  const australianStudy = getAustralianStudyPoints(
    userData.australianStudy || "",
  );
  const regionalStudy = userData.regionalStudy === "Yes" ? 5 : 0;
  const naatiCcl = userData.naatiCcl === "Yes" ? 5 : 0;
  const professionalYear = userData.professionalYear === "Yes" ? 5 : 0;
  const partner = getPartnerPoints(userData.partnerStatus || "");

  // DHA combined cap: Australian + Offshore experience cannot exceed 20 points total
  const combinedRaw = rawAU + rawOffshore;
  const combinedExp = Math.min(combinedRaw, COMBINED_EXPERIENCE_CAP);
  // Prioritise Australian points, fill remainder with offshore
  const australianExperience = Math.min(rawAU, COMBINED_EXPERIENCE_CAP);
  const offshoreExperience = combinedExp - australianExperience;

  const items = [
    { label: "Age", points: age, max: 30 },
    { label: "English", points: english, max: 20 },
    {
      label: "Australian Experience",
      points: australianExperience,
      max: 20,
    },
    { label: "Offshore Experience", points: offshoreExperience, max: 15 },
    { label: "Education", points: education, max: 20 },
    { label: "Australian Study", points: australianStudy, max: 5 },
    { label: "Regional Study", points: regionalStudy, max: 5 },
    { label: "NAATI / CCL", points: naatiCcl, max: 5 },
    { label: "Professional Year", points: professionalYear, max: 5 },
    { label: "Partner / Single", points: partner, max: 10 },
  ];

  const total = items.reduce((sum, i) => sum + i.points, 0);

  return {
    age,
    english,
    australianExperience,
    offshoreExperience,
    education,
    australianStudy,
    regionalStudy,
    naatiCcl,
    professionalYear,
    partner,
    total,
    items,
  };
}

/**
 * Lightweight points calculator for the live stepper counter.
 * Accepts partial data -- undefined fields are treated as 0 points.
 * No async operations, no database calls.
 * Must never throw on missing fields.
 */
export function calcPointsSoFar(data: Partial<UserProfile>): number {
  let pts = 0;

  const age = data.age;
  if (age) {
    if (age >= 18 && age <= 24) pts += 25;
    else if (age >= 25 && age <= 32) pts += 30;
    else if (age >= 33 && age <= 39) pts += 25;
    else if (age >= 40 && age <= 44) pts += 15;
  }

  const edu = data.educationLevel;
  if (edu === "PhD") pts += 20;
  else if (edu === "Masters" || edu === "Bachelor") pts += 15;
  else if (edu === "Diploma" || edu === "Trade") pts += 10;

  // Australian experience points
  let auPts = 0;
  const auExp = data.australianExperience;
  if (auExp === "1-3") auPts = 5;
  else if (auExp === "3-5") auPts = 10;
  else if (auExp === "5-8") auPts = 15;
  else if (auExp === "8+") auPts = 20;

  // Offshore experience points
  let offPts = 0;
  const exp = data.experience;
  if (exp === "1-3") offPts = 5;
  else if (exp === "3-5") offPts = 10;
  else if (exp === "5-8" || exp === "8+") offPts = 15;

  // Apply DHA combined cap: AU + offshore cannot exceed 20 points
  pts += Math.min(auPts + offPts, COMBINED_EXPERIENCE_CAP);

  if (data.englishScore === "Superior") pts += 20;
  else if (data.englishScore === "Proficient") pts += 10;

  if (data.australianStudy === "Yes") pts += 5;
  if (data.regionalStudy === "Yes") pts += 5;
  if (data.naatiCcl === "Yes") pts += 5;
  if (data.professionalYear === "Yes") pts += 5;

  if (data.partnerStatus === "Skilled") pts += 10;
  else if (data.partnerStatus === "English") pts += 5;
  else if (data.partnerStatus === "Single") pts += 10;

  return pts;
}

/**
 * Convert experience dropdown values to minimum numeric years.
 * Used by employer sponsored tab for 186/482 eligibility checks.
 */
export function parseExperienceYears(experience: string): number {
  switch (experience) {
    case "0-1":
      return 0;
    case "1-3":
      return 1;
    case "3-5":
      return 3;
    case "5-8":
      return 5;
    case "8+":
      return 8;
    default:
      return 0;
  }
}

/**
 * Derive partnerStatus from the combination of relationshipStatus and partnerSkills.
 * Used by the stepper to compute the derived field before passing to estimatePoints().
 */
export function derivePartnerStatus(
  relationshipStatus: string | undefined,
  partnerSkills: string | undefined,
): string {
  if (relationshipStatus === "Single") return "Single";
  if (partnerSkills === "Skilled") return "Skilled";
  if (partnerSkills === "English") return "English";
  if (partnerSkills === "Neither") return "None";
  return "";
}

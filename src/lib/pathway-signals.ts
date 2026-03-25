/**
 * Possibility rating and pathway signal logic.
 * Rule-based visa pathway statements about 189/190/491 eligibility.
 */

import type { Occupation } from "@/types/assessment";

export type PossibilityRating = "High" | "Medium" | "Low";

export type OccupationList = "MLTSSL" | "CSOL" | "STSOL" | "ROL";

/**
 * Determine the primary list from occupation boolean flags.
 * Priority: MLTSSL > CSOL > STSOL > ROL
 */
export function getPrimaryList(occupation: {
  mltssl: boolean;
  csol: boolean;
  stsol: boolean;
  rol: boolean;
}): OccupationList {
  if (occupation.mltssl) return "MLTSSL";
  if (occupation.csol) return "CSOL";
  if (occupation.stsol) return "STSOL";
  return "ROL";
}

/**
 * Calculate possibility rating for 189 visa pathway.
 *
 * - High: points >= min_189_points threshold AND occupation on MLTSSL [PR-1]
 * - Medium: meets threshold OR on MLTSSL (not both) [PR-2, PR-3]
 * - Medium: on MLTSSL but min_189_points is null (no threshold data) [PR-5]
 * - Low: neither condition met [PR-4]
 */
export function getPossibilityRating(
  userPoints: number,
  min189Points: number | null,
  isMltssl: boolean,
): PossibilityRating {
  const meetsThreshold =
    min189Points !== null && userPoints >= min189Points;

  if (meetsThreshold && isMltssl) return "High";
  if (meetsThreshold || isMltssl) return "Medium";
  return "Low";
}

/**
 * Generate human-readable pathway signal statements.
 * Based on list status, points, and min invite threshold.
 */
export function getPathwaySignal(occupation: Occupation): string[] {
  const signals: string[] = [];
  const list = getPrimaryList({
    mltssl: occupation.mltssl,
    csol: occupation.csol,
    stsol: occupation.stsol,
    rol: occupation.rol,
  });

  if (list === "MLTSSL") {
    signals.push("189 (Skilled Independent) visa pathway available.");
    if (occupation.min_189_points !== null) {
      signals.push(
        `This occupation was last invited at ${occupation.min_189_points} points in a Subclass 189 round.`,
      );
    }
  } else {
    signals.push(
      "189 (Skilled Independent) visa pathway is NOT available for this occupation.",
    );
  }

  if (list === "CSOL" || list === "STSOL") {
    signals.push("Employer-sponsored pathway (482/494) may be viable.");
  }

  signals.push(
    "190/491 state nomination may be possible depending on state nomination criteria.",
  );

  return signals;
}

/**
 * State nomination eligibility logic for Australian states/territories.
 * Ported from legacy stateNominationData.ts, adapted for database queries
 * (accepts pre-fetched state_nominations data rather than fetching CSVs).
 */

import type { StateNomination } from "@/types/database";

export type StateName =
  | "NSW"
  | "VIC"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "ACT"
  | "NT";

export type VisaStatus = boolean | "closed";

export interface StateEligibility {
  state: StateName;
  visa_190: VisaStatus;
  visa_491: VisaStatus;
}

export const STATE_NAMES: StateName[] = [
  "NSW",
  "VIC",
  "QLD",
  "SA",
  "WA",
  "TAS",
  "ACT",
  "NT",
];

/**
 * Normalize an occupation title for fuzzy matching.
 * Strips parenthetical content, "nec", "nfd", punctuation, and collapses whitespace.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\bnec\b/gi, "")
    .replace(/\bnfd\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute a condensed state invitation summary from eligibility data.
 * Returns a formatted string like "NSW, VIC, QLD inviting" or
 * "NSW, VIC + 3 more states inviting".
 *
 * Shows only states with at least one eligible visa (visa_190 or visa_491 is true).
 * If more than 3 states, shows first 2 + "+ N more states inviting".
 */
export function getStateInvitingSummary(eligibility: StateEligibility[]): string {
  const invitingStates = eligibility.filter(
    (e) => e.visa_190 === true || e.visa_491 === true,
  );

  if (invitingStates.length === 0) {
    return "No states currently inviting";
  }

  const stateNames = invitingStates.map((e) => e.state);

  if (stateNames.length <= 3) {
    return `${stateNames.join(", ")} inviting`;
  }

  const shown = stateNames.slice(0, 2);
  const remaining = stateNames.length - 2;
  return `${shown.join(", ")} + ${remaining} more states inviting`;
}

/**
 * Get state nomination eligibility for a given occupation.
 *
 * @param anzscoCode - 6-digit ANZSCO code
 * @param occupationTitle - occupation title (used for WA title matching)
 * @param occupationList - MLTSSL/CSOL/STSOL/ROL (used for VIC derivation)
 * @param stateNominations - pre-fetched state_nominations rows from the database
 */
export function getStateEligibility(
  anzscoCode: string,
  occupationTitle: string,
  occupationList: string,
  stateNominations: StateNomination[],
): StateEligibility[] {
  const unitGroup = anzscoCode.substring(0, 4);
  const normalizedOccTitle = normalizeTitle(occupationTitle);

  // Group nominations by state for lookup
  const byState = new Map<string, StateNomination[]>();
  for (const nom of stateNominations) {
    const existing = byState.get(nom.state) ?? [];
    existing.push(nom);
    byState.set(nom.state, existing);
  }

  // NSW: 4-digit unit group matching for 190, 491 always closed [SN-1]
  const nswNominations = byState.get("NSW") ?? [];
  const nswEligible190 = nswNominations.some(
    (n) => n.anzsco_code.substring(0, 4) === unitGroup,
  );

  // VIC: eligible if MLTSSL or STSOL [SN-2]
  const vicEligible = occupationList === "MLTSSL" || occupationList === "STSOL";

  // QLD: ANZSCO code sets for 190 and 491
  const qldNominations = byState.get("QLD") ?? [];
  const qld190 = qldNominations.some(
    (n) =>
      n.anzsco_code === anzscoCode &&
      n.visa_190?.toLowerCase() === "yes",
  );
  const qld491 = qldNominations.some(
    (n) =>
      n.anzsco_code === anzscoCode &&
      n.visa_491?.toLowerCase() === "yes",
  );

  // SA: ANZSCO code set, both visas
  const saNominations = byState.get("SA") ?? [];
  const saEligible = saNominations.some((n) => n.anzsco_code === anzscoCode);

  // WA: normalized title matching [SN-5]
  const waNominations = byState.get("WA") ?? [];
  const waEligible = waNominations.some(
    (n) =>
      normalizeTitle(n.occupation_title ?? "") === normalizedOccTitle &&
      normalizedOccTitle.length > 2,
  );

  // TAS: ANZSCO code set
  const tasNominations = byState.get("TAS") ?? [];
  const tasEligible = tasNominations.some((n) => n.anzsco_code === anzscoCode);

  // ACT: all 491, 190 unless "(491 Only)" [SN-4]
  const actNominations = byState.get("ACT") ?? [];
  const actMatch = actNominations.find((n) => n.anzsco_code === anzscoCode);
  const act491 = actMatch !== undefined;
  const act190 = actMatch !== undefined &&
    !actMatch.occupation_title?.toLowerCase().includes("(491 only)");

  // NT: fully closed [SN-3]

  return [
    { state: "NSW", visa_190: nswEligible190, visa_491: "closed" },
    { state: "VIC", visa_190: vicEligible, visa_491: vicEligible },
    { state: "QLD", visa_190: qld190, visa_491: qld491 },
    { state: "SA", visa_190: saEligible, visa_491: saEligible },
    { state: "WA", visa_190: waEligible, visa_491: waEligible },
    { state: "TAS", visa_190: tasEligible, visa_491: tasEligible },
    { state: "ACT", visa_190: act190, visa_491: act491 },
    { state: "NT", visa_190: "closed", visa_491: "closed" },
  ];
}

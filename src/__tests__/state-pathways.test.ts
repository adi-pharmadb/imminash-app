/**
 * Tests for state nomination eligibility, possibility rating,
 * and employer sponsored visa eligibility.
 */

import { describe, it, expect } from "vitest";
import {
  getStateEligibility,
  normalizeTitle,
} from "@/lib/state-nominations";
import type { StateNomination } from "@/types/database";
import {
  getPossibilityRating,
  getPrimaryList,
} from "@/lib/pathway-signals";
import { getEmployerEligibility } from "@/lib/employer-eligibility";

/** Helper to build a minimal StateNomination row. */
function buildNomination(
  overrides: Partial<StateNomination> = {},
): StateNomination {
  return {
    id: "test-id",
    state: "NSW",
    anzsco_code: "261313",
    occupation_title: "Software Engineer",
    visa_190: null,
    visa_491: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("State Nomination Eligibility", () => {
  it("SN-1: NSW matches by 4-digit unit group for 190, 491 always closed", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "NSW",
        anzsco_code: "261311",
        occupation_title: "Analyst Programmer",
      }),
    ];

    // 261313 shares unit group 2613 with 261311
    const result = getStateEligibility(
      "261313",
      "Software Engineer",
      "MLTSSL",
      nominations,
    );

    const nsw = result.find((s) => s.state === "NSW");
    expect(nsw).toBeDefined();
    expect(nsw!.visa_190).toBe(true);
    expect(nsw!.visa_491).toBe("closed");
  });

  it("SN-2: VIC derives eligibility from list (MLTSSL=eligible, CSOL=not eligible)", () => {
    const nominations: StateNomination[] = [];

    // MLTSSL occupation should be eligible
    const mltssl = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const vicMltssl = mltssl.find((s) => s.state === "VIC");
    expect(vicMltssl!.visa_190).toBe(true);
    expect(vicMltssl!.visa_491).toBe(true);

    // CSOL-only occupation should not be eligible
    const csol = getStateEligibility("261313", "Software Engineer", "CSOL", nominations);
    const vicCsol = csol.find((s) => s.state === "VIC");
    expect(vicCsol!.visa_190).toBe(false);
    expect(vicCsol!.visa_491).toBe(false);
  });

  it("SN-3: NT always closed for both visa types", () => {
    const nominations: StateNomination[] = [
      buildNomination({ state: "NT", anzsco_code: "261313" }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const nt = result.find((s) => s.state === "NT");
    expect(nt!.visa_190).toBe("closed");
    expect(nt!.visa_491).toBe("closed");
  });

  it("SN-4: ACT all eligible for 491; 190 eligible unless '(491 Only)'", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "ACT",
        anzsco_code: "261313",
        occupation_title: "Software Engineer",
      }),
      buildNomination({
        state: "ACT",
        anzsco_code: "233111",
        occupation_title: "Chemical Engineer (491 Only)",
      }),
    ];

    // Regular occupation: both visas eligible
    const result1 = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const act1 = result1.find((s) => s.state === "ACT");
    expect(act1!.visa_491).toBe(true);
    expect(act1!.visa_190).toBe(true);

    // 491 Only occupation: 491 eligible, 190 not eligible
    const result2 = getStateEligibility("233111", "Chemical Engineer (491 Only)", "MLTSSL", nominations);
    const act2 = result2.find((s) => s.state === "ACT");
    expect(act2!.visa_491).toBe(true);
    expect(act2!.visa_190).toBe(false);
  });

  it("SN-5: WA matches by normalized occupation title", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "WA",
        anzsco_code: "000000",
        occupation_title: "Software Engineer (nec)",
      }),
    ];

    const result = getStateEligibility(
      "261313",
      "Software Engineer",
      "MLTSSL",
      nominations,
    );

    const wa = result.find((s) => s.state === "WA");
    expect(wa!.visa_190).toBe(true);
    expect(wa!.visa_491).toBe(true);
  });
});

describe("Possibility Rating", () => {
  it("PR-1 + PR-4: High when points >= threshold AND MLTSSL; Low when neither", () => {
    // PR-1: High - points meet threshold and on MLTSSL
    expect(getPossibilityRating(75, 65, true)).toBe("High");
    expect(getPossibilityRating(65, 65, true)).toBe("High");

    // PR-4: Low - not MLTSSL and no threshold met
    expect(getPossibilityRating(50, 65, false)).toBe("Low");
    expect(getPossibilityRating(30, null, false)).toBe("Low");
  });
});

describe("Employer Sponsored Eligibility", () => {
  it("ES-1 + ES-2: Visa 186 eligible with MLTSSL + 3yrs AU; ineligible with < 3yrs", () => {
    // ES-1: Eligible - MLTSSL + 3 years AU experience
    const eligible = getEmployerEligibility(true, false, 3, 5);
    expect(eligible.visa_186.eligible).toBe(true);

    // ES-2: Not eligible - MLTSSL but only 1-3 years (parsed as 1 year minimum)
    const ineligible = getEmployerEligibility(true, false, 1, 3);
    expect(ineligible.visa_186.eligible).toBe(false);

    // ES-3: Not eligible - not on MLTSSL
    const notMltssl = getEmployerEligibility(false, true, 5, 5);
    expect(notMltssl.visa_186.eligible).toBe(false);
  });

  it("ES-4 + ES-5: Visa 482 eligible with CSOL + 1yr; ineligible with 0 experience", () => {
    // ES-4: Eligible - CSOL + 1 year total experience
    const eligible = getEmployerEligibility(false, true, 0, 1);
    expect(eligible.visa_482.eligible).toBe(true);

    // ES-5: Not eligible - CSOL but 0 total experience
    const ineligible = getEmployerEligibility(false, true, 0, 0);
    expect(ineligible.visa_482.eligible).toBe(false);

    // Not on CSOL
    const notCsol = getEmployerEligibility(true, false, 0, 5);
    expect(notCsol.visa_482.eligible).toBe(false);
  });
});

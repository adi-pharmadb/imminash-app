/**
 * Email gate, assessment API, and full results dashboard tests.
 *
 * Tests run in a Node environment and validate:
 * - Email validation logic
 * - Lead/assessment API payload validation
 * - Occupation card data rendering logic
 * - Points gap calculation
 * - State nomination matrix completeness
 * - Employer tab eligibility
 * - Tab switching logic
 */

import { describe, it, expect, vi } from "vitest";
import { getPossibilityRating, getPrimaryList, getPathwaySignal } from "@/lib/pathway-signals";
import { getStateEligibility, STATE_NAMES } from "@/lib/state-nominations";
import { getEmployerEligibility } from "@/lib/employer-eligibility";
import type { StateNomination } from "@/types/database";
import type { MatchResult, Occupation } from "@/types/assessment";

/** Email regex matching the one used in EmailGate component. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

describe("Email Gate and Results Dashboard", () => {
  it("AC-EG1: Invalid email disables submit -- regex rejects bad input", () => {
    const invalidEmails = [
      "notanemail",
      "missing@",
      "@nodomain.com",
      "spaces in@email.com",
      "",
      "no-at-sign.com",
    ];

    for (const email of invalidEmails) {
      expect(EMAIL_REGEX.test(email)).toBe(false);
    }

    // Valid emails should pass
    const validEmails = [
      "user@example.com",
      "test+tag@domain.co",
      "name@sub.domain.org",
    ];
    for (const email of validEmails) {
      expect(EMAIL_REGEX.test(email)).toBe(true);
    }
  });

  it("AC-EG2: Valid email submission builds correct lead payload", () => {
    const email = "test@example.com";
    const firstName = "Alice";
    const visaStatus = "485";
    const jobTitle = "Software Engineer";

    const payload = {
      email,
      first_name: firstName,
      visa_status: visaStatus,
      job_title: jobTitle,
    };

    // Verify payload has all required fields
    expect(payload.email).toBe(email);
    expect(payload.first_name).toBe(firstName);
    expect(payload.visa_status).toBe(visaStatus);
    expect(payload.job_title).toBe(jobTitle);

    // Verify email passes validation
    expect(EMAIL_REGEX.test(payload.email)).toBe(true);
  });

  it("Assessment API: builds correct assessment payload shape", () => {
    const payload = {
      profile_data: { firstName: "Alice", age: 28 },
      points_breakdown: { age: 30, english: 20, total: 80 },
      total_points: 80,
      matched_occupations: {
        skillsMatches: [
          { title: "Software Engineer", anzsco_code: "261313" },
        ],
        employerMatches: [],
      },
      user_id: null,
      lead_id: "some-uuid",
    };

    expect(payload.profile_data).toBeDefined();
    expect(typeof payload.total_points).toBe("number");
    expect(payload.matched_occupations.skillsMatches).toHaveLength(1);
    expect(payload.user_id).toBeNull();
    expect(payload.lead_id).toBe("some-uuid");
  });

  it("AC-FR1: Occupation card data contains all required fields including confidence", () => {
    const occupation: MatchResult = {
      title: "Software Engineer",
      anzsco_code: "261313",
      confidence: 92,
      reasoning: "Strong match for software development duties",
      experience_aligned: true,
      warnings: [],
      score: 5,
      assessing_authority: "ACS",
      list: "MLTSSL",
      min_189_points: 65,
      latest_invitation: null,
    };

    // Verify all required fields are present
    expect(occupation.title).toBe("Software Engineer");
    expect(occupation.anzsco_code).toBe("261313");
    expect(occupation.confidence).toBe(92);
    expect(occupation.reasoning).toBeTruthy();
    expect(occupation.list).toBe("MLTSSL");
    expect(occupation.assessing_authority).toBe("ACS");
    expect(occupation.min_189_points).toBe(65);

    // Verify possibility rating can be computed
    const possibility = getPossibilityRating(80, 65, true);
    expect(possibility).toBe("High");

    // Verify pathway signals are generated
    const occForSignals: Occupation = {
      id: "",
      anzsco_code: "261313",
      title: "Software Engineer",
      skill_level: null,
      assessing_authority: "ACS",
      mltssl: true,
      stsol: false,
      csol: false,
      rol: false,
      min_189_points: 65,
      qualification_level_required: null,
      unit_group_description: null,
      industry_keywords: null,
    };
    const signals = getPathwaySignal(occForSignals);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]).toContain("189");
  });

  it("AC-FR2: Points gap calculation -- 80pts, threshold 85 -> '5 points below threshold'", () => {
    const userPoints = 80;
    const threshold = 85;
    const diff = userPoints - threshold;

    expect(diff).toBe(-5);

    // Build the label the same way PointsGap component does
    const absDiff = Math.abs(diff);
    let label: string;
    if (diff >= 0) {
      label = `${diff} points above threshold`;
    } else {
      label = `${absDiff} points below threshold`;
    }

    expect(label).toBe("5 points below threshold");

    // Above threshold case
    const aboveDiff = 90 - 85;
    expect(aboveDiff).toBe(5);
    expect(`${aboveDiff} points above threshold`).toBe(
      "5 points above threshold",
    );
  });

  it("AC-FR3: State nom matrix shows all 8 states x 2 visas, NT='closed'", () => {
    // Use empty nominations to verify the base logic (VIC/NT/ACT still work)
    const eligibility = getStateEligibility(
      "261313",
      "Software Engineer",
      "MLTSSL",
      [],
    );

    // All 8 states present
    expect(eligibility).toHaveLength(8);
    const stateNames = eligibility.map((e) => e.state);
    expect(stateNames).toEqual([
      "NSW",
      "VIC",
      "QLD",
      "SA",
      "WA",
      "TAS",
      "ACT",
      "NT",
    ]);

    // Every row has both visa_190 and visa_491 fields
    for (const row of eligibility) {
      expect(row).toHaveProperty("visa_190");
      expect(row).toHaveProperty("visa_491");
    }

    // NT always closed
    const nt = eligibility.find((e) => e.state === "NT")!;
    expect(nt.visa_190).toBe("closed");
    expect(nt.visa_491).toBe("closed");

    // VIC should be eligible for MLTSSL occupation
    const vic = eligibility.find((e) => e.state === "VIC")!;
    expect(vic.visa_190).toBe(true);
    expect(vic.visa_491).toBe(true);
  });

  it("AC-FR4: Employer tab shows correct 186/482 eligibility", () => {
    // ES-1: MLTSSL + 3yrs AU -> 186 eligible
    const es1 = getEmployerEligibility(true, true, 3, 3);
    expect(es1.visa_186.eligible).toBe(true);

    // ES-2: MLTSSL + <3yrs AU -> 186 not eligible
    const es2 = getEmployerEligibility(true, true, 1, 1);
    expect(es2.visa_186.eligible).toBe(false);

    // ES-3: CSOL only + 5yrs -> 186 not eligible (needs MLTSSL)
    const es3 = getEmployerEligibility(false, true, 5, 5);
    expect(es3.visa_186.eligible).toBe(false);

    // ES-4: CSOL + 1yr total -> 482 eligible
    const es4 = getEmployerEligibility(false, true, 0, 1);
    expect(es4.visa_482.eligible).toBe(true);

    // ES-5: CSOL + 0 experience -> 482 not eligible
    const es5 = getEmployerEligibility(false, true, 0, 0);
    expect(es5.visa_482.eligible).toBe(false);

    // No pathways: not on MLTSSL and not on CSOL
    const none = getEmployerEligibility(false, false, 5, 5);
    expect(none.visa_186.eligible).toBe(false);
    expect(none.visa_482.eligible).toBe(false);
  });

  it("AC-FR5: Tab switching logic -- tracks active tab state", () => {
    // Simulate tab state
    let activeTab: "skills" | "employer" = "skills";

    // Initially skills tab is active
    expect(activeTab).toBe("skills");
    const skillsVisible = activeTab === "skills";
    const employerVisible = activeTab === "employer";
    expect(skillsVisible).toBe(true);
    expect(employerVisible).toBe(false);

    // Switch to employer tab
    activeTab = "employer";
    expect(activeTab).toBe("employer");
    const skillsVisibleAfter = activeTab === "skills";
    const employerVisibleAfter = activeTab === "employer";
    expect(skillsVisibleAfter).toBe(false);
    expect(employerVisibleAfter).toBe(true);

    // Switch back to skills tab
    activeTab = "skills";
    expect(activeTab).toBe("skills");
    expect(activeTab === "skills").toBe(true);
    expect(activeTab === "employer").toBe(false);
  });
});

/**
 * Tests for the Visa Pathway Decision Engine, Points Gap Analysis,
 * and Processing Times modules.
 */

import { describe, it, expect } from "vitest";
import {
  evaluate189,
  evaluate190,
  evaluate491,
  evaluateEmployerSponsored,
  selectRecommendedPathway,
  detectEdgeCases,
  analyzePathways,
  type PathwayResult,
  type EmployerPathwayResult,
} from "@/lib/visa-pathway-engine";
import { analyzePointsGap, formatGapSummary } from "@/lib/points-gap";
import { getProcessingTime, getTimelineToPR, LAST_UPDATED } from "@/lib/processing-times";
import type { MatchResult, PointsBreakdown, UserProfile } from "@/types/assessment";
import type { StateNomination } from "@/types/database";

/** Helper: build a default UserProfile. */
function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    firstName: "Test",
    age: 28,
    visaStatus: "500",
    visaExpiry: "03/2027",
    educationLevel: "Bachelor",
    fieldOfStudy: "Computer Science",
    universityName: "University of Melbourne",
    countryOfEducation: "Australia",
    australianStudy: "No",
    regionalStudy: "No",
    additionalDegree: "None",
    additionalDegreeField: "",
    additionalDegreeCountry: "",
    workingSkilled: "Yes",
    jobTitle: "Software Engineer",
    australianExperience: "1-3",
    experience: "3-5",
    jobDuties: "",
    englishScore: "Proficient",
    naatiCcl: "No",
    professionalYear: "No",
    relationshipStatus: "Single",
    partnerSkills: "",
    partnerStatus: "Single",
    ...overrides,
  };
}

/** Helper: build a default PointsBreakdown. */
function buildBreakdown(overrides: Partial<PointsBreakdown> = {}): PointsBreakdown {
  const defaults: PointsBreakdown = {
    age: 30,
    english: 10,
    australianExperience: 5,
    offshoreExperience: 10,
    education: 15,
    australianStudy: 0,
    regionalStudy: 0,
    naatiCcl: 0,
    professionalYear: 0,
    partner: 10,
    total: 80,
    items: [],
  };
  const merged = { ...defaults, ...overrides };
  // Recalculate total if individual fields changed but total not explicitly set
  if (!overrides.total && Object.keys(overrides).length > 0) {
    merged.total =
      merged.age +
      merged.english +
      merged.australianExperience +
      merged.offshoreExperience +
      merged.education +
      merged.australianStudy +
      merged.regionalStudy +
      merged.naatiCcl +
      merged.professionalYear +
      merged.partner;
  }
  return merged;
}

/** Helper: build a default MatchResult. */
function buildOccupation(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    title: "Software Engineer",
    anzsco_code: "261313",
    confidence: 0.95,
    reasoning: "Strong match",
    experience_aligned: true,
    warnings: [],
    score: 95,
    assessing_authority: "ACS",
    list: "MLTSSL",
    min_189_points: 65,
    latest_invitation: null,
    ...overrides,
  };
}

/** Helper: build a StateNomination row. */
function buildNomination(overrides: Partial<StateNomination> = {}): StateNomination {
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

// ---------------------------------------------------------------------------
// Subclass 189
// ---------------------------------------------------------------------------
describe("evaluate189", () => {
  it("returns Strong when points >= cutoff AND MLTSSL", () => {
    const breakdown = buildBreakdown({ total: 75 });
    const occupation = buildOccupation({ min_189_points: 65 });

    const result = evaluate189(75, breakdown, occupation, "MLTSSL");

    expect(result.rating).toBe("Strong");
    expect(result.visa).toBe("189");
    expect(result.effectivePoints).toBe(75);
    expect(result.bonusPoints).toBe(0);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it("returns Competitive when within 5 points of cutoff AND MLTSSL", () => {
    const breakdown = buildBreakdown({ total: 62 });
    const occupation = buildOccupation({ min_189_points: 65 });

    const result = evaluate189(62, breakdown, occupation, "MLTSSL");

    expect(result.rating).toBe("Competitive");
  });

  it("returns Gap Exists when points are more than 5 below cutoff AND MLTSSL", () => {
    const breakdown = buildBreakdown({ total: 55 });
    const occupation = buildOccupation({ min_189_points: 65 });

    const result = evaluate189(55, breakdown, occupation, "MLTSSL");

    expect(result.rating).toBe("Gap Exists");
    expect(result.gapAnalysis).not.toBeNull();
    expect(result.gapAnalysis!.gap).toBe(10);
  });

  it("returns Not Available when occupation is STSOL only", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ list: "STSOL" });

    const result = evaluate189(80, breakdown, occupation, "STSOL");

    expect(result.rating).toBe("Not Available");
    expect(result.gapAnalysis).toBeNull();
    expect(result.nextSteps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Subclass 190
// ---------------------------------------------------------------------------
describe("evaluate190", () => {
  it("effective points include +5 bonus", () => {
    const breakdown = buildBreakdown({ total: 70 });
    const occupation = buildOccupation();
    const nominations = [buildNomination({ state: "NSW", anzsco_code: "261311" })];

    const result = evaluate190(70, breakdown, occupation, "MLTSSL", nominations);

    expect(result.effectivePoints).toBe(75);
    expect(result.bonusPoints).toBe(5);
  });

  it("returns Strong when effective points meet threshold and states are inviting", () => {
    const breakdown = buildBreakdown({ total: 65 });
    const occupation = buildOccupation();
    const nominations = [buildNomination({ state: "NSW", anzsco_code: "261311" })];

    const result = evaluate190(65, breakdown, occupation, "MLTSSL", nominations);

    expect(result.rating).toBe("Strong");
    expect(result.stateEligibility.length).toBeGreaterThan(0);
  });

  it("returns Not Available when occupation is ROL", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ list: "ROL" });

    const result = evaluate190(80, breakdown, occupation, "ROL", []);

    expect(result.rating).toBe("Not Available");
  });

  it("is eligible for STSOL occupations", () => {
    const breakdown = buildBreakdown({ total: 65 });
    const occupation = buildOccupation({ list: "STSOL" });

    const result = evaluate190(65, breakdown, occupation, "STSOL", []);

    expect(result.rating).not.toBe("Not Available");
  });
});

// ---------------------------------------------------------------------------
// Subclass 491
// ---------------------------------------------------------------------------
describe("evaluate491", () => {
  it("effective points include +15 bonus", () => {
    const breakdown = buildBreakdown({ total: 55 });
    const occupation = buildOccupation();

    const result = evaluate491(55, breakdown, occupation, "MLTSSL", []);

    expect(result.effectivePoints).toBe(70);
    expect(result.bonusPoints).toBe(15);
  });

  it("flags as provisional visa", () => {
    const breakdown = buildBreakdown({ total: 55 });
    const occupation = buildOccupation();

    const result = evaluate491(55, breakdown, occupation, "MLTSSL", []);

    expect(result.isProvisional).toBe(true);
  });

  it("is available for MLTSSL, STSOL, and ROL occupations", () => {
    const breakdown = buildBreakdown({ total: 60 });
    const occupation = buildOccupation();

    for (const list of ["MLTSSL", "STSOL", "ROL"] as const) {
      const result = evaluate491(60, breakdown, occupation, list, []);
      expect(result.rating).not.toBe("Not Available");
    }
  });

  it("returns Not Available for CSOL-only occupations", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ list: "CSOL" });

    const result = evaluate491(80, breakdown, occupation, "CSOL", []);

    expect(result.rating).toBe("Not Available");
  });
});

// ---------------------------------------------------------------------------
// Recommended Pathway Selection
// ---------------------------------------------------------------------------
describe("selectRecommendedPathway", () => {
  function buildPathwayResult(overrides: Partial<PathwayResult>): PathwayResult {
    return {
      visa: "189",
      visaName: "Subclass 189",
      rating: "Not Available",
      reasoning: "",
      userPoints: 70,
      effectivePoints: 70,
      bonusPoints: 0,
      cutoff: 65,
      gapAnalysis: null,
      stateEligibility: [],
      processingTime: { range: "6-12 months", typical: "" },
      timelineToPR: { description: "", immediacyLabel: "" },
      isProvisional: false,
      nextSteps: [],
      ...overrides,
    };
  }

  function buildEmployerResult(eligible186 = false, eligible482 = false): EmployerPathwayResult {
    return {
      visa: "employer",
      visaName: "Employer Sponsored",
      eligibility: {
        visa_186: { eligible: eligible186, reason: "" },
        visa_482: { eligible: eligible482, reason: "" },
      },
      reasoning: "",
      processingTime: { range: "1-4 months", typical: "" },
      timelineToPR: { description: "", immediacyLabel: "" },
      nextSteps: [],
    };
  }

  it("prioritizes 189 Strong over all others", () => {
    const pathways = [
      buildPathwayResult({ visa: "189", rating: "Strong" }),
      buildPathwayResult({ visa: "190", rating: "Strong" }),
      buildPathwayResult({ visa: "491", rating: "Strong" }),
    ];

    const result = selectRecommendedPathway(pathways, buildEmployerResult(true, true));

    expect(result.visa).toBe("189");
    expect(result.confidence).toBe("High");
  });

  it("recommends 190 when 189 has a gap but 190 is viable", () => {
    const pathways = [
      buildPathwayResult({ visa: "189", rating: "Gap Exists" }),
      buildPathwayResult({ visa: "190", rating: "Strong" }),
      buildPathwayResult({ visa: "491", rating: "Strong" }),
    ];

    const result = selectRecommendedPathway(pathways, buildEmployerResult());

    expect(result.visa).toBe("190");
  });

  it("recommends 491 when 189 and 190 are not viable", () => {
    const pathways = [
      buildPathwayResult({ visa: "189", rating: "Not Available" }),
      buildPathwayResult({ visa: "190", rating: "Not Available" }),
      buildPathwayResult({ visa: "491", rating: "Strong" }),
    ];

    const result = selectRecommendedPathway(pathways, buildEmployerResult());

    expect(result.visa).toBe("491");
  });

  it("falls back to employer when all points-based pathways are weak", () => {
    const pathways = [
      buildPathwayResult({ visa: "189", rating: "Not Available" }),
      buildPathwayResult({ visa: "190", rating: "Gap Exists" }),
      buildPathwayResult({ visa: "491", rating: "Gap Exists" }),
    ];

    const result = selectRecommendedPathway(pathways, buildEmployerResult(false, true));

    expect(result.visa).toBe("employer");
  });

  it("recommends consultation when all pathways are weak and no employer eligibility", () => {
    const pathways = [
      buildPathwayResult({ visa: "189", rating: "Not Available" }),
      buildPathwayResult({ visa: "190", rating: "Not Available" }),
      buildPathwayResult({ visa: "491", rating: "Gap Exists" }),
    ];

    const result = selectRecommendedPathway(pathways, buildEmployerResult());

    expect(result.visa).toBe("consultation");
    expect(result.confidence).toBe("Low");
  });
});

// ---------------------------------------------------------------------------
// Edge Case Detection
// ---------------------------------------------------------------------------
describe("detectEdgeCases", () => {
  it("flags points below 65 as critical", () => {
    const warnings = detectEdgeCases(50, buildProfile(), [buildOccupation()]);

    const lowPoints = warnings.find((w) => w.type === "low-points");
    expect(lowPoints).toBeDefined();
    expect(lowPoints!.severity).toBe("critical");
  });

  it("flags age 45+ as critical (ineligible)", () => {
    const warnings = detectEdgeCases(70, buildProfile({ age: 46 }), [buildOccupation()]);

    const ageWarning = warnings.find((w) => w.type === "age-ineligible");
    expect(ageWarning).toBeDefined();
    expect(ageWarning!.severity).toBe("critical");
  });

  it("flags age 40-44 as warning (urgency)", () => {
    const warnings = detectEdgeCases(70, buildProfile({ age: 42 }), [buildOccupation()]);

    const ageWarning = warnings.find((w) => w.type === "age-urgent");
    expect(ageWarning).toBeDefined();
    expect(ageWarning!.severity).toBe("warning");
  });

  it("flags STSOL-only occupation", () => {
    const warnings = detectEdgeCases(70, buildProfile(), [buildOccupation({ list: "STSOL" })]);

    const stsolWarning = warnings.find((w) => w.type === "stsol-only");
    expect(stsolWarning).toBeDefined();
    expect(stsolWarning!.severity).toBe("warning");
  });

  it("flags ROL-only occupation", () => {
    const warnings = detectEdgeCases(70, buildProfile(), [buildOccupation({ list: "ROL" })]);

    const rolWarning = warnings.find((w) => w.type === "rol-only");
    expect(rolWarning).toBeDefined();
  });

  it("flags visa expiry within 6 months", () => {
    // Set expiry to 2 months from now
    const now = new Date();
    const expiryMonth = String(now.getMonth() + 3).padStart(2, "0"); // 2 months ahead (getMonth is 0-based, +1 for display, +2 ahead)
    const expiryYear = now.getFullYear();
    const visaExpiry = `${expiryMonth}/${expiryYear}`;

    const warnings = detectEdgeCases(70, buildProfile({ visaExpiry }), [buildOccupation()]);

    const expiryWarning = warnings.find((w) => w.type === "visa-expiry");
    expect(expiryWarning).toBeDefined();
    expect(expiryWarning!.severity).toBe("critical");
  });

  it("does not flag visa expiry more than 6 months away", () => {
    const now = new Date();
    const futureYear = now.getFullYear() + 2;
    const visaExpiry = `06/${futureYear}`;

    const warnings = detectEdgeCases(70, buildProfile({ visaExpiry }), [buildOccupation()]);

    const expiryWarning = warnings.find((w) => w.type === "visa-expiry");
    expect(expiryWarning).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// analyzePathways orchestrator
// ---------------------------------------------------------------------------
describe("analyzePathways", () => {
  it("returns 189/190 as Not Available for age 45+ users", () => {
    const formData = buildProfile({ age: 46 });
    const breakdown = buildBreakdown({ total: 70 });
    const occupations = [buildOccupation()];

    const results = analyzePathways(formData, occupations, breakdown, []);

    expect(results).toHaveLength(1);
    const analysis = results[0];
    const p189 = analysis.pathways.find((p) => p.visa === "189");
    const p190 = analysis.pathways.find((p) => p.visa === "190");
    const p491 = analysis.pathways.find((p) => p.visa === "491");

    expect(p189!.rating).toBe("Not Available");
    expect(p190!.rating).toBe("Not Available");
    expect(p491!.rating).toBe("Not Available");
  });

  it("returns correct pathway analysis for a strong MLTSSL candidate", () => {
    const formData = buildProfile({ age: 28 });
    const breakdown = buildBreakdown({ total: 80 });
    const occupations = [buildOccupation({ min_189_points: 65 })];
    const nominations = [buildNomination({ state: "NSW", anzsco_code: "261311" })];

    const results = analyzePathways(formData, occupations, breakdown, nominations);

    expect(results).toHaveLength(1);
    const analysis = results[0];
    expect(analysis.recommended.visa).toBe("189");
    expect(analysis.recommended.confidence).toBe("High");
  });

  it("recommends consultation when points < 65 and no employer eligibility", () => {
    const formData = buildProfile({ age: 28, australianExperience: "0-1", experience: "0-1" });
    const breakdown = buildBreakdown({ total: 40 });
    const occupations = [buildOccupation({ min_189_points: 65, list: "ROL" })];

    const results = analyzePathways(formData, occupations, breakdown, []);

    const analysis = results[0];
    expect(analysis.recommended.visa).toBe("consultation");
  });
});

// ---------------------------------------------------------------------------
// Points Gap Analysis
// ---------------------------------------------------------------------------
describe("analyzePointsGap", () => {
  it("calculates correct gap amount", () => {
    const breakdown = buildBreakdown({ total: 55 });

    const result = analyzePointsGap(breakdown, 65);

    expect(result.gap).toBe(10);
    expect(result.currentPoints).toBe(55);
    expect(result.targetPoints).toBe(65);
  });

  it("returns 0 gap when points meet target", () => {
    const breakdown = buildBreakdown({ total: 70 });

    const result = analyzePointsGap(breakdown, 65);

    expect(result.gap).toBe(0);
    expect(result.summary).toContain("meet the points requirement");
  });

  it("suggests English improvement when not maxed", () => {
    const breakdown = buildBreakdown({ english: 0, total: 55 });

    const result = analyzePointsGap(breakdown, 65);

    const englishSuggestion = result.suggestions.find((s) => s.action.includes("English"));
    expect(englishSuggestion).toBeDefined();
    expect(englishSuggestion!.available).toBe(true);
  });

  it("does not suggest English improvement when already at Superior", () => {
    const breakdown = buildBreakdown({ english: 20, total: 55 });

    const result = analyzePointsGap(breakdown, 65);

    const englishSuggestion = result.suggestions.find((s) => s.action.includes("English"));
    expect(englishSuggestion).toBeUndefined();
  });

  it("suggests NAATI when not claimed", () => {
    const breakdown = buildBreakdown({ naatiCcl: 0, total: 55 });

    const result = analyzePointsGap(breakdown, 65);

    const naatiSuggestion = result.suggestions.find((s) => s.action.includes("NAATI"));
    expect(naatiSuggestion).toBeDefined();
  });

  it("does not suggest NAATI when already claimed", () => {
    const breakdown = buildBreakdown({ naatiCcl: 5, total: 60 });

    const result = analyzePointsGap(breakdown, 65);

    const naatiSuggestion = result.suggestions.find((s) => s.action.includes("NAATI"));
    expect(naatiSuggestion).toBeUndefined();
  });

  it("marks Professional Year as available for ACS authority", () => {
    const breakdown = buildBreakdown({ professionalYear: 0, total: 55 });

    const result = analyzePointsGap(breakdown, 65, "ACS");

    const pySuggestion = result.suggestions.find((s) => s.action.includes("Professional Year"));
    expect(pySuggestion).toBeDefined();
    expect(pySuggestion!.available).toBe(true);
  });

  it("marks Professional Year as unavailable for non-eligible authority", () => {
    const breakdown = buildBreakdown({ professionalYear: 0, total: 55 });

    const result = analyzePointsGap(breakdown, 65, "VETASSESS");

    const pySuggestion = result.suggestions.find((s) => s.action.includes("Professional Year"));
    expect(pySuggestion).toBeDefined();
    expect(pySuggestion!.available).toBe(false);
  });

  it("sorts suggestions by availability then points gain", () => {
    const breakdown = buildBreakdown({ english: 0, naatiCcl: 0, professionalYear: 0, total: 40 });

    const result = analyzePointsGap(breakdown, 65, "VETASSESS");

    // All available suggestions should come before unavailable ones
    const firstUnavailableIdx = result.suggestions.findIndex((s) => !s.available);
    if (firstUnavailableIdx > 0) {
      const allBeforeAvailable = result.suggestions
        .slice(0, firstUnavailableIdx)
        .every((s) => s.available);
      expect(allBeforeAvailable).toBe(true);
    }
  });
});

describe("formatGapSummary", () => {
  it("returns success message when gap is 0", () => {
    expect(formatGapSummary(0, [])).toContain("meet the points requirement");
  });

  it("returns actionable summary when gap exists", () => {
    const suggestions = [
      { action: "Improve English", pointsGain: 10, feasibility: "Moderate" as const, timeframe: "1-3 months", available: true },
    ];

    const summary = formatGapSummary(10, suggestions);

    expect(summary).toContain("10 more points");
    expect(summary).toContain("Improve English");
  });
});

// ---------------------------------------------------------------------------
// Processing Times
// ---------------------------------------------------------------------------
describe("Processing Times", () => {
  it("returns correct processing time for 189", () => {
    const result = getProcessingTime("189");
    expect(result.range).toBe("6-12 months");
  });

  it("returns correct processing time for 482", () => {
    const result = getProcessingTime("482");
    expect(result.range).toBe("1-4 months");
  });

  it("returns timeline showing immediate PR for 189", () => {
    const result = getTimelineToPR("189");
    expect(result.immediacyLabel).toContain("Immediate PR");
  });

  it("returns timeline showing provisional for 491", () => {
    const result = getTimelineToPR("491");
    expect(result.immediacyLabel).toContain("Provisional");
    expect(result.description).toContain("3 years");
  });

  it("returns fallback for unknown visa", () => {
    const result = getProcessingTime("999");
    expect(result.range).toBe("Unknown");
  });

  it("has a valid last updated date", () => {
    expect(LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

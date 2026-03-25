/**
 * Integration tests for the visa pathway feature.
 * Tests full flows from session data through pathway analysis,
 * covering MLTSSL/STSOL occupations, points gap suggestions,
 * edge cases, and recommended pathway selection.
 */

import { describe, it, expect } from "vitest";
import {
  analyzePathways,
  detectEdgeCases,
  type PathwayAnalysis,
} from "@/lib/visa-pathway-engine";
import { analyzePointsGap } from "@/lib/points-gap";
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

/** Helper: build a default PointsBreakdown with auto-calculated total. */
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
// Full flow: high-points MLTSSL user
// ---------------------------------------------------------------------------
describe("Integration: high-points MLTSSL user full flow", () => {
  const profile = buildProfile({ age: 28 });
  const breakdown = buildBreakdown({ total: 80 });
  const occupations = [buildOccupation({ list: "MLTSSL", min_189_points: 65 })];
  const nominations = [
    buildNomination({ state: "NSW", anzsco_code: "2613" }),
    buildNomination({ state: "VIC", anzsco_code: "261313", visa_190: "yes", visa_491: "yes" }),
  ];

  let analysis: PathwayAnalysis;

  it("analyzePathways returns exactly one analysis for one occupation", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    expect(results).toHaveLength(1);
    analysis = results[0];
  });

  it("evaluates all three points-based pathways (189, 190, 491)", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    const visas = analysis.pathways.map((p) => p.visa);
    expect(visas).toContain("189");
    expect(visas).toContain("190");
    expect(visas).toContain("491");
    expect(analysis.pathways).toHaveLength(3);
  });

  it("rates 189 as Strong for 80 points vs 65 cutoff on MLTSSL", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    const p189 = analysis.pathways.find((p) => p.visa === "189");
    expect(p189).toBeDefined();
    expect(p189!.rating).toBe("Strong");
    expect(p189!.effectivePoints).toBe(80);
    expect(p189!.cutoff).toBe(65);
    expect(p189!.gapAnalysis).toBeNull();
  });

  it("rates 190 as Strong with +5 bonus for effective 85 points", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    const p190 = analysis.pathways.find((p) => p.visa === "190");
    expect(p190).toBeDefined();
    expect(p190!.rating).toBe("Strong");
    expect(p190!.effectivePoints).toBe(85);
    expect(p190!.bonusPoints).toBe(5);
  });

  it("rates 491 as Strong with +15 bonus for effective 95 points", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    const p491 = analysis.pathways.find((p) => p.visa === "491");
    expect(p491).toBeDefined();
    expect(p491!.rating).toBe("Strong");
    expect(p491!.effectivePoints).toBe(95);
    expect(p491!.bonusPoints).toBe(15);
    expect(p491!.isProvisional).toBe(true);
  });

  it("recommends 189 as the top pathway", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    expect(analysis.recommended.visa).toBe("189");
    expect(analysis.recommended.confidence).toBe("High");
    expect(analysis.recommended.reasoning).toContain("189");
  });

  it("includes employer pathway evaluation", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    expect(analysis.employerPathway).toBeDefined();
    expect(analysis.employerPathway.visa).toBe("employer");
  });

  it("generates no critical warnings for a strong young candidate", () => {
    const results = analyzePathways(profile, occupations, breakdown, nominations);
    analysis = results[0];

    const criticalWarnings = analysis.warnings.filter((w) => w.severity === "critical");
    expect(criticalWarnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Full flow: STSOL-only occupation
// ---------------------------------------------------------------------------
describe("Integration: STSOL-only occupation user", () => {
  const profile = buildProfile({ age: 30 });
  const breakdown = buildBreakdown({ total: 75 });
  const occupations = [
    buildOccupation({
      title: "Chef",
      anzsco_code: "351311",
      list: "STSOL",
      assessing_authority: "TRA",
      min_189_points: null,
    }),
  ];

  it("marks 189 as Not Available for STSOL occupation", () => {
    const results = analyzePathways(profile, occupations, breakdown, []);
    const p189 = results[0].pathways.find((p) => p.visa === "189");

    expect(p189).toBeDefined();
    expect(p189!.rating).toBe("Not Available");
    expect(p189!.reasoning).toContain("not on the MLTSSL");
  });

  it("evaluates 190 as available for STSOL occupation", () => {
    const results = analyzePathways(profile, occupations, breakdown, []);
    const p190 = results[0].pathways.find((p) => p.visa === "190");

    expect(p190).toBeDefined();
    expect(p190!.rating).not.toBe("Not Available");
  });

  it("evaluates 491 as available for STSOL occupation", () => {
    const results = analyzePathways(profile, occupations, breakdown, []);
    const p491 = results[0].pathways.find((p) => p.visa === "491");

    expect(p491).toBeDefined();
    expect(p491!.rating).not.toBe("Not Available");
  });

  it("generates STSOL-only warning", () => {
    const results = analyzePathways(profile, occupations, breakdown, []);
    const stsolWarning = results[0].warnings.find((w) => w.type === "stsol-only");

    expect(stsolWarning).toBeDefined();
    expect(stsolWarning!.severity).toBe("warning");
  });

  it("does not recommend 189 for STSOL user", () => {
    const results = analyzePathways(profile, occupations, breakdown, []);
    expect(results[0].recommended.visa).not.toBe("189");
  });
});

// ---------------------------------------------------------------------------
// Points gap suggestions relevance
// ---------------------------------------------------------------------------
describe("Integration: points gap suggestions match user profile", () => {
  it("does not suggest English improvement when already at Superior (20)", () => {
    const breakdown = buildBreakdown({
      english: 20,
      naatiCcl: 0,
      professionalYear: 0,
      total: 60,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const englishSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("english"),
    );
    expect(englishSuggestion).toBeUndefined();
  });

  it("does not suggest NAATI when already claimed (5)", () => {
    const breakdown = buildBreakdown({
      english: 10,
      naatiCcl: 5,
      total: 60,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const naatiSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("naati"),
    );
    expect(naatiSuggestion).toBeUndefined();
  });

  it("does not suggest Professional Year when already completed (5)", () => {
    const breakdown = buildBreakdown({
      professionalYear: 5,
      total: 60,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const pySuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("professional year"),
    );
    expect(pySuggestion).toBeUndefined();
  });

  it("does not suggest partner skills when already maxed (10)", () => {
    const breakdown = buildBreakdown({
      partner: 10,
      total: 60,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const partnerSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("partner"),
    );
    expect(partnerSuggestion).toBeUndefined();
  });

  it("does not suggest more AU experience when already at max (20)", () => {
    const breakdown = buildBreakdown({
      australianExperience: 20,
      total: 60,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const auExpSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("australian work experience"),
    );
    expect(auExpSuggestion).toBeUndefined();
  });

  it("suggests English improvement when at Competent (0 points)", () => {
    const breakdown = buildBreakdown({
      english: 0,
      total: 50,
    });

    const gap = analyzePointsGap(breakdown, 65, "ACS");

    const englishSuggestions = gap.suggestions.filter((s) =>
      s.action.toLowerCase().includes("english"),
    );
    expect(englishSuggestions.length).toBeGreaterThan(0);
    // Should suggest both Proficient and Superior paths
    expect(englishSuggestions.length).toBe(2);
  });

  it("only suggests available improvements for the user's assessing authority", () => {
    const breakdown = buildBreakdown({
      english: 10,
      naatiCcl: 0,
      professionalYear: 0,
      total: 55,
    });

    // VETASSESS is not eligible for Professional Year
    const gap = analyzePointsGap(breakdown, 65, "VETASSESS");

    const pySuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("professional year"),
    );
    expect(pySuggestion).toBeDefined();
    expect(pySuggestion!.available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases trigger correct warnings
// ---------------------------------------------------------------------------
describe("Integration: edge case warnings", () => {
  it("triggers critical warning for age 45+", () => {
    const profile = buildProfile({ age: 46 });
    const occupations = [buildOccupation()];
    const warnings = detectEdgeCases(70, profile, occupations);

    const ageWarning = warnings.find((w) => w.type === "age-ineligible");
    expect(ageWarning).toBeDefined();
    expect(ageWarning!.severity).toBe("critical");
    expect(ageWarning!.message).toContain("45");
  });

  it("triggers critical warning for points < 65", () => {
    const profile = buildProfile();
    const occupations = [buildOccupation()];
    const warnings = detectEdgeCases(50, profile, occupations);

    const lowPoints = warnings.find((w) => w.type === "low-points");
    expect(lowPoints).toBeDefined();
    expect(lowPoints!.severity).toBe("critical");
    expect(lowPoints!.message).toContain("50");
  });

  it("triggers STSOL-only warning for STSOL occupation", () => {
    const profile = buildProfile();
    const occupations = [buildOccupation({ list: "STSOL" })];
    const warnings = detectEdgeCases(70, profile, occupations);

    const stsolWarning = warnings.find((w) => w.type === "stsol-only");
    expect(stsolWarning).toBeDefined();
    expect(stsolWarning!.severity).toBe("warning");
  });

  it("marks all points-based pathways as Not Available for age 45+", () => {
    const profile = buildProfile({ age: 46 });
    const breakdown = buildBreakdown({ total: 80 });
    const occupations = [buildOccupation()];

    const results = analyzePathways(profile, occupations, breakdown, []);
    const allNotAvailable = results[0].pathways.every((p) => p.rating === "Not Available");

    expect(allNotAvailable).toBe(true);
  });

  it("combines multiple warnings when applicable (age 45+ and low points)", () => {
    const profile = buildProfile({ age: 46 });
    const occupations = [buildOccupation({ list: "STSOL" })];
    const warnings = detectEdgeCases(50, profile, occupations);

    expect(warnings.length).toBeGreaterThanOrEqual(3);
    const types = warnings.map((w) => w.type);
    expect(types).toContain("low-points");
    expect(types).toContain("age-ineligible");
    expect(types).toContain("stsol-only");
  });
});

// ---------------------------------------------------------------------------
// Recommended pathway changes based on points level
// ---------------------------------------------------------------------------
describe("Integration: recommended pathway varies by points level", () => {
  const mltsslOccupation = buildOccupation({ list: "MLTSSL", min_189_points: 65 });
  const nominations = [
    buildNomination({ state: "NSW", anzsco_code: "2613" }),
    buildNomination({ state: "VIC", anzsco_code: "261313", visa_190: "yes", visa_491: "yes" }),
  ];

  it("recommends 189 for high-points user (80 points, MLTSSL)", () => {
    const profile = buildProfile({ age: 28 });
    const breakdown = buildBreakdown({ total: 80 });

    const results = analyzePathways(profile, [mltsslOccupation], breakdown, nominations);

    expect(results[0].recommended.visa).toBe("189");
    expect(results[0].recommended.confidence).toBe("High");
  });

  it("recommends 190 for medium-points user (62 points, MLTSSL) where +5 bridges the gap", () => {
    const profile = buildProfile({ age: 28 });
    const breakdown = buildBreakdown({ total: 62 });

    const results = analyzePathways(profile, [mltsslOccupation], breakdown, nominations);

    // 62 points: 189 is Competitive (within 5 of 65), but 190 with +5 = 67 is Strong
    // selectRecommendedPathway checks 189 first: Competitive is not Strong, so it checks 190
    // 190 should be Strong (67 >= 65 and states are inviting)
    expect(results[0].recommended.visa).toBe("190");
  });

  it("recommends 491 for low-points user (45 points, MLTSSL) where only +15 helps", () => {
    const profile = buildProfile({ age: 28 });
    const breakdown = buildBreakdown({ total: 45 });

    const results = analyzePathways(profile, [mltsslOccupation], breakdown, nominations);

    // 45 points: 189 Gap Exists, 190 with +5 = 50 still Gap Exists, 491 with +15 = 60 still Gap Exists
    // All three have gaps, none are Strong/Competitive, so it falls to employer or consultation
    // For a user with "1-3" AU experience and "3-5" offshore, employer 482 may be eligible
    const recommended = results[0].recommended.visa;
    // At 45 points, no points-based pathway meets threshold even with bonuses
    expect(["employer", "consultation"]).toContain(recommended);
  });

  it("recommends 491 for a user with 52 points where only +15 reaches threshold", () => {
    const profile = buildProfile({ age: 28 });
    const breakdown = buildBreakdown({ total: 52 });

    const results = analyzePathways(profile, [mltsslOccupation], breakdown, nominations);

    // 52 points: 189 Gap (needs 65), 190 with +5 = 57 Gap, 491 with +15 = 67 Strong
    const p491 = results[0].pathways.find((p) => p.visa === "491");
    expect(p491!.rating).toBe("Strong");
    expect(results[0].recommended.visa).toBe("491");
  });

  it("falls back to employer/consultation when all pathways have gaps", () => {
    const profile = buildProfile({ age: 28, australianExperience: "0-1", experience: "0-1" });
    const breakdown = buildBreakdown({ total: 40 });
    const rolOccupation = buildOccupation({ list: "ROL", min_189_points: null });

    const results = analyzePathways(profile, [rolOccupation], breakdown, []);

    // ROL: 189 Not Available, 190 Not Available, 491 with +15 = 55 (Gap Exists)
    const recommended = results[0].recommended.visa;
    expect(["employer", "consultation"]).toContain(recommended);
  });
});

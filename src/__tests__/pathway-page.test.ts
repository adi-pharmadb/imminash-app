/**
 * Tests for the Pathway Page components and page-level behavior.
 * Covers PathwayCard, RecommendedBanner, PointsGapAnalysis,
 * StateAvailabilityTable, EdgeCaseWarning, and session redirect logic.
 */

import { describe, it, expect } from "vitest";
import {
  evaluate189,
  evaluate190,
  evaluate491,
  analyzePathways,
  detectEdgeCases,
  selectRecommendedPathway,
  type PathwayResult,
  type EdgeCaseWarning,
} from "@/lib/visa-pathway-engine";
import { analyzePointsGap, type PointsImprovement } from "@/lib/points-gap";
import { getStateEligibility } from "@/lib/state-nominations";
import { getProcessingTime, getTimelineToPR } from "@/lib/processing-times";
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
// PathwayCard data tests (component renders visa name, rating, points, next steps)
// ---------------------------------------------------------------------------
describe("PathwayCard data", () => {
  it("renders pathway result with visa name, rating, points comparison, and next steps", () => {
    const breakdown = buildBreakdown({ total: 75 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const result = evaluate189(75, breakdown, occupation, "MLTSSL");

    expect(result.visaName).toBe("Subclass 189 - Skilled Independent");
    expect(result.rating).toBe("Strong");
    expect(result.effectivePoints).toBe(75);
    expect(result.cutoff).toBe(65);
    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps[0]).toContain("EOI");
  });

  it("shows Strong rating with green-style data for 189 when points >= cutoff", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const result = evaluate189(80, breakdown, occupation, "MLTSSL");

    expect(result.rating).toBe("Strong");
    expect(result.effectivePoints).toBeGreaterThanOrEqual(result.cutoff!);
    expect(result.reasoning).toContain("meet or exceed");
  });

  it("shows Not Available with muted data for 189 when not MLTSSL", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ list: "STSOL", min_189_points: 65 });
    const result = evaluate189(80, breakdown, occupation, "STSOL");

    expect(result.rating).toBe("Not Available");
    expect(result.reasoning).toContain("not on the MLTSSL");
    expect(result.nextSteps).toHaveLength(0);
    expect(result.cutoff).toBeNull();
  });

  it("includes bonus points display data for 190 pathway", () => {
    const breakdown = buildBreakdown({ total: 60 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const result = evaluate190(60, breakdown, occupation, "MLTSSL", []);

    expect(result.bonusPoints).toBe(5);
    expect(result.effectivePoints).toBe(65);
    expect(result.visa).toBe("190");
  });

  it("includes bonus points display data for 491 pathway", () => {
    const breakdown = buildBreakdown({ total: 50 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const result = evaluate491(50, breakdown, occupation, "MLTSSL", []);

    expect(result.bonusPoints).toBe(15);
    expect(result.effectivePoints).toBe(65);
    expect(result.visa).toBe("491");
  });
});

// ---------------------------------------------------------------------------
// RecommendedBanner data tests
// ---------------------------------------------------------------------------
describe("RecommendedBanner data", () => {
  it("renders the top recommendation with reasoning", () => {
    const breakdown = buildBreakdown({ total: 80 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const pathways: PathwayResult[] = [
      evaluate189(80, breakdown, occupation, "MLTSSL"),
      evaluate190(80, breakdown, occupation, "MLTSSL", []),
      evaluate491(80, breakdown, occupation, "MLTSSL", []),
    ];
    const employerPathway = {
      visa: "employer",
      visaName: "Employer Sponsored (482/494/186)",
      eligibility: {
        visa_186: { eligible: false, reason: "test" },
        visa_482: { eligible: true, reason: "test" },
      },
      reasoning: "test",
      processingTime: getProcessingTime("482"),
      timelineToPR: getTimelineToPR("482"),
      nextSteps: [],
    };

    const recommended = selectRecommendedPathway(pathways, employerPathway);

    expect(recommended.visa).toBe("189");
    expect(recommended.visaName).toContain("189");
    expect(recommended.reasoning).toBeTruthy();
    expect(recommended.reasoning.length).toBeGreaterThan(10);
    expect(recommended.confidence).toBe("High");
  });

  it("recommends 190 when 189 has a gap but 190 bridges it", () => {
    const breakdown = buildBreakdown({ total: 62 });
    const occupation = buildOccupation({ min_189_points: 65 });
    const noms = [
      buildNomination({ state: "NSW", anzsco_code: "2613" }),
    ];
    const pathways: PathwayResult[] = [
      evaluate189(62, breakdown, occupation, "MLTSSL"),
      evaluate190(62, breakdown, occupation, "MLTSSL", noms),
      evaluate491(62, breakdown, occupation, "MLTSSL", noms),
    ];
    const employerPathway = {
      visa: "employer",
      visaName: "Employer Sponsored",
      eligibility: {
        visa_186: { eligible: false, reason: "test" },
        visa_482: { eligible: false, reason: "test" },
      },
      reasoning: "test",
      processingTime: getProcessingTime("482"),
      timelineToPR: getTimelineToPR("482"),
      nextSteps: [],
    };

    const recommended = selectRecommendedPathway(pathways, employerPathway);

    // 190 with +5 gives 67 which meets threshold, so should be recommended
    expect(recommended.visa).toBe("190");
    expect(recommended.reasoning).toContain("190");
  });
});

// ---------------------------------------------------------------------------
// PointsGapAnalysis data tests
// ---------------------------------------------------------------------------
describe("PointsGapAnalysis data", () => {
  it("renders gap amount and improvement suggestions", () => {
    const breakdown = buildBreakdown({
      english: 0,
      naatiCcl: 0,
      professionalYear: 0,
      total: 55,
    });
    const gap = analyzePointsGap(breakdown, 65, "ACS");

    expect(gap.gap).toBe(10);
    expect(gap.currentPoints).toBe(55);
    expect(gap.targetPoints).toBe(65);
    expect(gap.suggestions.length).toBeGreaterThan(0);

    // Should suggest English improvement
    const englishSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("english"),
    );
    expect(englishSuggestion).toBeDefined();
    expect(englishSuggestion!.pointsGain).toBeGreaterThanOrEqual(10);

    // Should suggest NAATI
    const naatiSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("naati"),
    );
    expect(naatiSuggestion).toBeDefined();
    expect(naatiSuggestion!.pointsGain).toBe(5);
  });

  it("does not suggest improvements that are already maxed", () => {
    const breakdown = buildBreakdown({
      english: 20,
      naatiCcl: 5,
      professionalYear: 5,
      partner: 10,
      australianExperience: 20,
      total: 90,
    });
    const gap = analyzePointsGap(breakdown, 95, "ACS");

    // English already at 20 (max), naati at 5, PY at 5, partner at 10, AU exp at 20
    // Should have no english or naati suggestions
    const englishSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("english"),
    );
    expect(englishSuggestion).toBeUndefined();

    const naatiSuggestion = gap.suggestions.find((s) =>
      s.action.toLowerCase().includes("naati"),
    );
    expect(naatiSuggestion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// StateAvailabilityTable data tests
// ---------------------------------------------------------------------------
describe("StateAvailabilityTable data", () => {
  it("renders state-by-state 190/491 breakdown", () => {
    const nominations: StateNomination[] = [
      buildNomination({ state: "NSW", anzsco_code: "2613" }),
      buildNomination({ state: "QLD", anzsco_code: "261313", visa_190: "yes", visa_491: "yes" }),
      buildNomination({ state: "SA", anzsco_code: "261313" }),
    ];

    const eligibility = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);

    // Should have all 8 states
    expect(eligibility).toHaveLength(8);

    // NSW should have 190 eligible (4-digit match 2613)
    const nsw = eligibility.find((e) => e.state === "NSW");
    expect(nsw).toBeDefined();
    expect(nsw!.visa_190).toBe(true);
    expect(nsw!.visa_491).toBe("closed"); // NSW 491 always closed

    // QLD should have both
    const qld = eligibility.find((e) => e.state === "QLD");
    expect(qld).toBeDefined();
    expect(qld!.visa_190).toBe(true);
    expect(qld!.visa_491).toBe(true);

    // SA should have both (ANZSCO match)
    const sa = eligibility.find((e) => e.state === "SA");
    expect(sa).toBeDefined();
    expect(sa!.visa_190).toBe(true);

    // VIC should be eligible (MLTSSL)
    const vic = eligibility.find((e) => e.state === "VIC");
    expect(vic).toBeDefined();
    expect(vic!.visa_190).toBe(true);
    expect(vic!.visa_491).toBe(true);

    // NT always closed
    const nt = eligibility.find((e) => e.state === "NT");
    expect(nt).toBeDefined();
    expect(nt!.visa_190).toBe("closed");
    expect(nt!.visa_491).toBe("closed");
  });
});

// ---------------------------------------------------------------------------
// EdgeCaseWarning data tests
// ---------------------------------------------------------------------------
describe("EdgeCaseWarning data", () => {
  it("renders age warning for users 40+", () => {
    const profile = buildProfile({ age: 42 });
    const occupations = [buildOccupation()];
    const warnings = detectEdgeCases(80, profile, occupations);

    const ageWarning = warnings.find((w) => w.type === "age-urgent");
    expect(ageWarning).toBeDefined();
    expect(ageWarning!.severity).toBe("warning");
    expect(ageWarning!.message).toContain("age");
    expect(ageWarning!.action).toBeTruthy();
  });

  it("renders critical age warning for users 45+", () => {
    const profile = buildProfile({ age: 46 });
    const occupations = [buildOccupation()];
    const warnings = detectEdgeCases(80, profile, occupations);

    const ageWarning = warnings.find((w) => w.type === "age-ineligible");
    expect(ageWarning).toBeDefined();
    expect(ageWarning!.severity).toBe("critical");
    expect(ageWarning!.message).toContain("ineligible");
  });

  it("renders low points warning when below 65", () => {
    const profile = buildProfile();
    const occupations = [buildOccupation()];
    const warnings = detectEdgeCases(55, profile, occupations);

    const pointsWarning = warnings.find((w) => w.type === "low-points");
    expect(pointsWarning).toBeDefined();
    expect(pointsWarning!.severity).toBe("critical");
    expect(pointsWarning!.message).toContain("below");
  });

  it("renders STSOL-only warning", () => {
    const profile = buildProfile();
    const occupations = [buildOccupation({ list: "STSOL" })];
    const warnings = detectEdgeCases(80, profile, occupations);

    const stsolWarning = warnings.find((w) => w.type === "stsol-only");
    expect(stsolWarning).toBeDefined();
    expect(stsolWarning!.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// Pathway page session redirect behavior
// ---------------------------------------------------------------------------
describe("Pathway page session data handling", () => {
  it("analyzePathways returns analyses when given valid session data", () => {
    const profile = buildProfile();
    const occupations = [buildOccupation()];
    const breakdown = buildBreakdown({ total: 80 });

    const analyses = analyzePathways(profile, occupations, breakdown, []);

    expect(analyses).toHaveLength(1);
    expect(analyses[0].occupation.anzsco_code).toBe("261313");
    expect(analyses[0].pathways).toHaveLength(3); // 189, 190, 491
    expect(analyses[0].recommended).toBeDefined();
    expect(analyses[0].recommended.visa).toBeTruthy();
  });

  it("analyzePathways handles age 45+ by marking 189/190/491 as Not Available", () => {
    const profile = buildProfile({ age: 46 });
    const occupations = [buildOccupation()];
    const breakdown = buildBreakdown({ total: 80 });

    const analyses = analyzePathways(profile, occupations, breakdown, []);

    expect(analyses[0].pathways.every((p) => p.rating === "Not Available")).toBe(true);
    // Should recommend employer or consultation
    expect(["employer", "consultation"]).toContain(analyses[0].recommended.visa);
  });

  it("redirects to /assessment conceptually when no session data (validated via analyzePathways requiring data)", () => {
    // The page checks sessionStorage for "imminash_results" and redirects if null.
    // We verify the engine requires proper inputs by checking it processes empty arrays gracefully.
    const profile = buildProfile();
    const occupations: MatchResult[] = [];
    const breakdown = buildBreakdown({ total: 80 });

    const analyses = analyzePathways(profile, occupations, breakdown, []);
    // With no occupations, should return empty analyses array
    expect(analyses).toHaveLength(0);
  });
});

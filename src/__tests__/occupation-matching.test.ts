/**
 * AI occupation matching tests covering structured output,
 * canonical validation, keyword fallback, confidence scoring,
 * pre-filtering, and enhanced matching pipeline.
 */

import { describe, it, expect, vi } from "vitest";
import {
  aiMatchOccupations,
  validateAgainstCanonical,
  keywordMatchOccupations,
  matchOccupations,
  preFilterOccupations,
  getConfidenceColor,
  isWeakMatch,
  type MatchOccupationsRequest,
  type EnrichedOccupation,
  type AIMatchItem,
} from "@/lib/occupation-matching";

/** Sample canonical ANZSCO occupation titles for testing. */
const CANONICAL_TITLES = [
  "Software Engineer",
  "ICT Business Analyst",
  "Developer Programmer",
  "Database Administrator",
  "Systems Analyst",
  "Accountant (General)",
  "Civil Engineer",
  "Mechanical Engineer",
  "Registered Nurse",
  "Chef",
];

/** Sample enriched occupations for pre-filtering tests. */
const ENRICHED_OCCUPATIONS: EnrichedOccupation[] = [
  { title: "Software Engineer", anzsco_code: "261313", unit_group_description: "Software and Applications Programmers design, develop, test software", industry_keywords: ["software engineering", "programming", "application development"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "ICT Business Analyst", anzsco_code: "261111", unit_group_description: "ICT Business and Systems Analysts identify requirements", industry_keywords: ["business analysis", "systems analysis", "ICT consulting"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Developer Programmer", anzsco_code: "261312", unit_group_description: "Software and Applications Programmers design, develop, test software", industry_keywords: ["software engineering", "programming"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Database Administrator", anzsco_code: "262111", unit_group_description: "Database and Systems Administrators plan and maintain database systems", industry_keywords: ["database administration", "data management"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Systems Analyst", anzsco_code: "261112", unit_group_description: "ICT Business and Systems Analysts identify requirements", industry_keywords: ["systems analysis", "ICT consulting"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Accountant (General)", anzsco_code: "221111", unit_group_description: "Accountants plan and provide systems for financial dealings", industry_keywords: ["accounting", "auditing", "taxation"], qualification_level_required: "Bachelor degree or higher", mltssl: false, stsol: false, csol: true },
  { title: "Civil Engineer", anzsco_code: "233211", unit_group_description: "Civil Engineers design and oversee construction of structures", industry_keywords: ["civil engineering", "construction", "structural"], qualification_level_required: "Bachelor degree or higher", mltssl: false, stsol: false, csol: true },
  { title: "Mechanical Engineer", anzsco_code: "233512", unit_group_description: "Mechanical Engineers design and oversee mechanical systems", industry_keywords: ["mechanical engineering", "manufacturing"], qualification_level_required: "Bachelor degree or higher", mltssl: false, stsol: false, csol: true },
  { title: "Registered Nurse", anzsco_code: "254499", unit_group_description: "Registered Nurses provide nursing care", industry_keywords: ["nursing", "healthcare", "patient care"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Chef", anzsco_code: "351311", unit_group_description: "Chefs plan and organise the preparation of food", industry_keywords: ["cooking", "culinary", "food preparation"], qualification_level_required: "AQF Certificate III", mltssl: false, stsol: true, csol: true },
];

/** Helper to build a valid request with sensible defaults. */
function buildRequest(
  overrides: Partial<MatchOccupationsRequest> = {},
): MatchOccupationsRequest {
  return {
    fieldOfStudy: "Computer Science",
    jobTitle: "Software Developer",
    jobDuties: "Developing web applications and APIs using React and Node.js for enterprise clients",
    additionalFieldOfStudy: "",
    additionalDegreeLevel: "",
    additionalDegreeCountry: "",
    skillsOccupations: ENRICHED_OCCUPATIONS.filter(o => o.mltssl || o.stsol).map(o => o.title),
    employerOccupations: ENRICHED_OCCUPATIONS.filter(o => o.csol).map(o => o.title),
    ...overrides,
  };
}

/** Build a mock Anthropic client that returns enhanced tool use response with confidence. */
function buildMockAnthropicClient(
  toolInput: { skillsMatches: AIMatchItem[]; employerMatches: AIMatchItem[] } | null,
) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: toolInput
          ? [{ type: "tool_use", input: toolInput }]
          : [{ type: "text", text: "No matches found" }],
      }),
    },
  };
}

/** Build a mock Anthropic client that throws an error. */
function buildFailingAnthropicClient() {
  return {
    messages: {
      create: vi.fn().mockRejectedValue(new Error("API connection timeout")),
    },
  };
}

describe("AI Occupation Matching", () => {
  it("AI-1: mock Anthropic returns objects with confidence, reasoning, and warnings", async () => {
    const mockClient = buildMockAnthropicClient({
      skillsMatches: [
        { title: "Software Engineer", confidence: 92, reasoning: "Strong match based on duties", experience_alignment: true, warnings: [] },
        { title: "Developer Programmer", confidence: 85, reasoning: "Good programming match", experience_alignment: true, warnings: [] },
      ],
      employerMatches: [
        { title: "Civil Engineer", confidence: 40, reasoning: "Weak match", experience_alignment: false, warnings: ["Field mismatch"] },
      ],
    });

    const result = await aiMatchOccupations(
      buildRequest(),
      ENRICHED_OCCUPATIONS.filter(o => o.mltssl || o.stsol),
      ENRICHED_OCCUPATIONS.filter(o => o.csol),
      [],
      mockClient,
      "claude-sonnet-4-6",
    );

    expect(result).not.toBeNull();
    expect(result!.skillsMatches).toHaveLength(2);
    expect(result!.skillsMatches[0].title).toBe("Software Engineer");
    expect(result!.skillsMatches[0].confidence).toBe(92);
    expect(result!.skillsMatches[0].reasoning).toBe("Strong match based on duties");
    expect(result!.skillsMatches[0].experience_alignment).toBe(true);
    expect(result!.skillsMatches[0].warnings).toEqual([]);

    expect(result!.employerMatches[0].confidence).toBe(40);
    expect(result!.employerMatches[0].warnings).toContain("Field mismatch");
  });

  it("AI-2: canonical validation works with new object-based match format", () => {
    const aiReturnedItems: AIMatchItem[] = [
      { title: "Software Engineer", confidence: 90, reasoning: "Match", experience_alignment: true, warnings: [] },
      { title: "Chief Innovation Officer", confidence: 80, reasoning: "Match", experience_alignment: true, warnings: [] },
      { title: "Developer Programmer", confidence: 75, reasoning: "Match", experience_alignment: true, warnings: [] },
      { title: "AI Ethics Specialist", confidence: 70, reasoning: "Match", experience_alignment: true, warnings: [] },
    ];

    const valid = validateAgainstCanonical(aiReturnedItems, CANONICAL_TITLES);

    expect(valid).toHaveLength(2);
    expect(valid.map(v => v.title)).toContain("Software Engineer");
    expect(valid.map(v => v.title)).toContain("Developer Programmer");
    expect(valid.map(v => v.title)).not.toContain("Chief Innovation Officer");
  });

  it("AI-3: on AI failure, fallback returns results with confidence scores", async () => {
    const failingClient = buildFailingAnthropicClient();

    const result = await matchOccupations(
      buildRequest(),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      [],
      failingClient,
      "claude-sonnet-4-6",
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result.skillsMatches)).toBe(true);
    expect(Array.isArray(result.employerMatches)).toBe(true);
    expect(result.skillsMatches.length).toBeGreaterThan(0);

    // Each match must have confidence-based fields
    for (const match of result.skillsMatches) {
      expect(match).toHaveProperty("title");
      expect(match).toHaveProperty("score");
      expect(match).toHaveProperty("confidence");
      expect(match).toHaveProperty("reasoning");
      expect(match).toHaveProperty("warnings");
    }
  });

  it("AI-4: pre-filtering reduces occupations and ranks by relevance", () => {
    const filtered = preFilterOccupations(
      ENRICHED_OCCUPATIONS,
      "Computer Science",
      "Software Developer",
      "Developing web applications and APIs using React and Node.js for enterprise clients",
      "",
      5,
    );

    expect(filtered.length).toBeLessThanOrEqual(5);
    // Software-related occupations should rank higher than unrelated ones
    const titles = filtered.map(o => o.title);
    expect(titles).toContain("Software Engineer");
  });

  it("AI-5: confidence color mapping returns correct ranges (70+/50+/<50)", () => {
    const green = getConfidenceColor(85);
    expect(green.text).toBe("oklch(0.72 0.17 155)");
    expect(green.shadow).not.toBe("none");

    const amber = getConfidenceColor(55);
    expect(amber.text).toBe("oklch(0.78 0.12 70)");

    const red = getConfidenceColor(40);
    expect(red.text).toBe("oklch(0.65 0.2 25)");

    // Edge cases at boundaries
    expect(getConfidenceColor(70).text).toBe("oklch(0.72 0.17 155)"); // green at 70
    expect(getConfidenceColor(69).text).toBe("oklch(0.78 0.12 70)"); // amber at 69
    expect(getConfidenceColor(50).text).toBe("oklch(0.78 0.12 70)"); // amber at 50
    expect(getConfidenceColor(49).text).toBe("oklch(0.65 0.2 25)"); // red at 49
  });

  it("AI-6: weak match detection at 50% threshold", () => {
    expect(isWeakMatch(49)).toBe(true);
    expect(isWeakMatch(0)).toBe(true);
    expect(isWeakMatch(50)).toBe(false);
    expect(isWeakMatch(51)).toBe(false);
    expect(isWeakMatch(100)).toBe(false);
  });

  it("AI-7: keyword fallback returns confidence scores and reasoning", () => {
    const matches = keywordMatchOccupations(
      "Software Engineering",
      "Software Engineer",
      "Building software systems and writing code for web applications",
      "",
      ["Software Engineer", "Chef", "Registered Nurse"],
      true,
      3,
    );

    const softwareMatch = matches.find((m) => m.title === "Software Engineer");
    expect(softwareMatch).toBeDefined();
    expect(softwareMatch!.confidence).toBeGreaterThan(60);
    expect(softwareMatch!.reasoning).toBeTruthy();
    expect(softwareMatch!.score).toBeGreaterThanOrEqual(4);

    const chefMatch = matches.find((m) => m.title === "Chef");
    expect(chefMatch).toBeDefined();
    expect(chefMatch!.score).toBeLessThan(4);
  });
});

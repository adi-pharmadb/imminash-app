/**
 * Task Group 7: Gap analysis tests for the Smart Occupation Matching
 * & Agent Knowledge System feature.
 *
 * These tests fill critical gaps identified across Task Groups 1-6,
 * covering end-to-end workflows and edge cases specific to the
 * confidence scoring, agent knowledge, and enhanced matching pipeline.
 */

import { describe, it, expect, vi } from "vitest";
import {
  matchOccupations,
  buildMatchingPrompt,
  preFilterOccupations,
  getConfidenceColor,
  isWeakMatch,
  keywordMatchOccupations,
  type MatchOccupationsRequest,
  type EnrichedOccupation,
  type AIMatchItem,
} from "@/lib/occupation-matching";
import {
  getStateEligibility,
  getStateInvitingSummary,
} from "@/lib/state-nominations";
import type { AgentKnowledge } from "@/types/database";

/** Enriched occupations for pipeline tests. */
const ENRICHED_OCCUPATIONS: EnrichedOccupation[] = [
  { title: "Software Engineer", anzsco_code: "261313", unit_group_description: "Software and Applications Programmers design, develop, test software", industry_keywords: ["software engineering", "programming", "application development"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "ICT Business Analyst", anzsco_code: "261111", unit_group_description: "ICT Business and Systems Analysts identify requirements", industry_keywords: ["business analysis", "systems analysis", "ICT consulting"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Developer Programmer", anzsco_code: "261312", unit_group_description: "Software and Applications Programmers design, develop, test software", industry_keywords: ["software engineering", "programming"], qualification_level_required: "Bachelor degree or higher", mltssl: true, stsol: false, csol: true },
  { title: "Accountant (General)", anzsco_code: "221111", unit_group_description: "Accountants plan and provide systems for financial dealings", industry_keywords: ["accounting", "auditing", "taxation"], qualification_level_required: "Bachelor degree or higher", mltssl: false, stsol: false, csol: true },
  { title: "Civil Engineer", anzsco_code: "233211", unit_group_description: "Civil Engineers design and oversee construction of structures", industry_keywords: ["civil engineering", "construction"], qualification_level_required: "Bachelor degree or higher", mltssl: false, stsol: false, csol: true },
  { title: "Chef", anzsco_code: "351311", unit_group_description: "Chefs plan and organise the preparation of food", industry_keywords: ["cooking", "culinary", "food preparation"], qualification_level_required: "AQF Certificate III", mltssl: false, stsol: true, csol: true },
];

const CANONICAL_TITLES = ENRICHED_OCCUPATIONS.map((o) => o.title);

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
    skillsOccupations: ENRICHED_OCCUPATIONS.filter((o) => o.mltssl || o.stsol).map((o) => o.title),
    employerOccupations: ENRICHED_OCCUPATIONS.filter((o) => o.csol).map((o) => o.title),
    ...overrides,
  };
}

describe("TG7-1: Full matching pipeline from user input to final response shape", () => {
  it("keyword fallback returns OccupationMatch objects with all required fields", async () => {
    const result = await matchOccupations(
      buildRequest(),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      [],
      null,
      "claude-sonnet-4-6",
    );

    expect(result.skillsMatches.length).toBeGreaterThan(0);
    expect(result.employerMatches.length).toBeGreaterThan(0);

    for (const match of [...result.skillsMatches, ...result.employerMatches]) {
      expect(typeof match.title).toBe("string");
      expect(typeof match.confidence).toBe("number");
      expect(typeof match.reasoning).toBe("string");
      expect(typeof match.experience_aligned).toBe("boolean");
      expect(Array.isArray(match.warnings)).toBe(true);
      expect(typeof match.score).toBe("number");
    }
  });
});

describe("TG7-2: Agent knowledge entries appear in AI prompt", () => {
  it("buildMatchingPrompt includes agent strategic_advice and common_pitfalls", () => {
    const agentKnowledge: AgentKnowledge[] = [
      {
        id: "ak-1",
        anzsco_code: "261313",
        strategic_advice: "Focus on demonstrating full-stack development experience",
        common_pitfalls: "Many applicants confuse Software Engineer with Developer Programmer",
        recommended_approach: null,
        tips_and_hacks: null,
        custom_notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const prompt = buildMatchingPrompt(
      buildRequest(),
      ENRICHED_OCCUPATIONS.filter((o) => o.mltssl || o.stsol),
      ENRICHED_OCCUPATIONS.filter((o) => o.csol),
      agentKnowledge,
    );

    expect(prompt).toContain("Agent Note: Focus on demonstrating full-stack development experience");
    expect(prompt).toContain("Common Pitfall: Many applicants confuse Software Engineer with Developer Programmer");
  });

  it("buildMatchingPrompt works without agent knowledge", () => {
    const prompt = buildMatchingPrompt(
      buildRequest(),
      ENRICHED_OCCUPATIONS.filter((o) => o.mltssl || o.stsol),
      ENRICHED_OCCUPATIONS.filter((o) => o.csol),
      [],
    );

    expect(prompt).not.toContain("Agent Note:");
    expect(prompt).not.toContain("Common Pitfall:");
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("ANZSCO 261313");
  });
});

describe("TG7-3: Weak match triggers correct UI signals", () => {
  it("confidence <= 60 is classified as weak match", () => {
    expect(isWeakMatch(60)).toBe(true);
    expect(isWeakMatch(59)).toBe(true);
    expect(isWeakMatch(0)).toBe(true);
    expect(isWeakMatch(61)).toBe(false);
  });

  it("weak match color is red (oklch 0.65 0.2 25)", () => {
    const colors = getConfidenceColor(55);
    expect(colors.text).toBe("oklch(0.65 0.2 25)");
  });

  it("strong match has glow shadow, weak match does not", () => {
    const strong = getConfidenceColor(90);
    expect(strong.shadow).not.toBe("none");

    const weak = getConfidenceColor(50);
    expect(weak.shadow).toBe("none");
  });
});

describe("TG7-4: State invitation summary condensation", () => {
  it("shows all names when 3 or fewer states inviting", () => {
    const eligibility = [
      { state: "NSW" as const, visa_190: true as const, visa_491: false as const },
      { state: "VIC" as const, visa_190: true as const, visa_491: true as const },
      { state: "QLD" as const, visa_190: false as const, visa_491: false as const },
      { state: "SA" as const, visa_190: false as const, visa_491: false as const },
      { state: "WA" as const, visa_190: false as const, visa_491: false as const },
      { state: "TAS" as const, visa_190: false as const, visa_491: false as const },
      { state: "ACT" as const, visa_190: false as const, visa_491: false as const },
      { state: "NT" as const, visa_190: "closed" as const, visa_491: "closed" as const },
    ];

    const summary = getStateInvitingSummary(eligibility);
    expect(summary).toBe("NSW, VIC inviting");
  });

  it("condenses to 'X, Y + N more states inviting' when > 3 states", () => {
    const eligibility = [
      { state: "NSW" as const, visa_190: true as const, visa_491: true as const },
      { state: "VIC" as const, visa_190: true as const, visa_491: true as const },
      { state: "QLD" as const, visa_190: true as const, visa_491: false as const },
      { state: "SA" as const, visa_190: true as const, visa_491: false as const },
      { state: "WA" as const, visa_190: true as const, visa_491: false as const },
      { state: "TAS" as const, visa_190: false as const, visa_491: false as const },
      { state: "ACT" as const, visa_190: false as const, visa_491: false as const },
      { state: "NT" as const, visa_190: "closed" as const, visa_491: "closed" as const },
    ];

    const summary = getStateInvitingSummary(eligibility);
    expect(summary).toBe("NSW, VIC + 3 more states inviting");
  });

  it("returns 'No states currently inviting' when none eligible", () => {
    const eligibility = [
      { state: "NSW" as const, visa_190: false as const, visa_491: false as const },
      { state: "VIC" as const, visa_190: false as const, visa_491: false as const },
      { state: "QLD" as const, visa_190: false as const, visa_491: false as const },
      { state: "SA" as const, visa_190: false as const, visa_491: false as const },
      { state: "WA" as const, visa_190: false as const, visa_491: false as const },
      { state: "TAS" as const, visa_190: false as const, visa_491: false as const },
      { state: "ACT" as const, visa_190: false as const, visa_491: false as const },
      { state: "NT" as const, visa_190: "closed" as const, visa_491: "closed" as const },
    ];

    const summary = getStateInvitingSummary(eligibility);
    expect(summary).toBe("No states currently inviting");
  });
});

describe("TG7-5: Pre-filter pipeline ranking accuracy", () => {
  it("software-related occupations rank above unrelated ones like Chef", () => {
    const filtered = preFilterOccupations(
      ENRICHED_OCCUPATIONS,
      "Computer Science",
      "Software Developer",
      "Building web apps with React, Node.js, and deploying to cloud infrastructure",
      "",
      6,
    );

    const titles = filtered.map((o) => o.title);
    const softwareIdx = titles.indexOf("Software Engineer");
    const chefIdx = titles.indexOf("Chef");

    // Software Engineer should appear before Chef in ranking
    expect(softwareIdx).toBeLessThan(chefIdx);
  });

  it("pre-filter respects topN limit", () => {
    const filtered = preFilterOccupations(
      ENRICHED_OCCUPATIONS,
      "Computer Science",
      "Software Developer",
      "Building web apps with React and Node.js for enterprise clients across multiple industries",
      "",
      3,
    );

    expect(filtered.length).toBeLessThanOrEqual(3);
  });
});

describe("TG7-6: AI failure with enriched pipeline still produces valid fallback", () => {
  it("failing AI client returns keyword-based matches with confidence", async () => {
    const failingClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    };

    const agentKnowledge: AgentKnowledge[] = [
      {
        id: "ak-1",
        anzsco_code: "261313",
        strategic_advice: "This should not cause errors even with AI failure",
        common_pitfalls: null,
        recommended_approach: null,
        tips_and_hacks: null,
        custom_notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const result = await matchOccupations(
      buildRequest(),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      agentKnowledge,
      failingClient,
      "claude-sonnet-4-6",
    );

    expect(result).toBeDefined();
    expect(result.skillsMatches.length).toBeGreaterThan(0);

    // Every match should have confidence scoring even in fallback
    for (const match of result.skillsMatches) {
      expect(match.confidence).toBeGreaterThanOrEqual(0);
      expect(match.confidence).toBeLessThanOrEqual(100);
      expect(match.reasoning).toBeTruthy();
    }
  });
});

describe("TG7-7: Prompt includes unit group descriptions from enrichment", () => {
  it("prompt contains ANZSCO description text for enriched occupations", () => {
    const prompt = buildMatchingPrompt(
      buildRequest(),
      ENRICHED_OCCUPATIONS.filter((o) => o.mltssl || o.stsol),
      ENRICHED_OCCUPATIONS.filter((o) => o.csol),
      [],
    );

    expect(prompt).toContain("ANZSCO Description: Software and Applications Programmers design, develop, test software");
    expect(prompt).toContain("Qualification Required: Bachelor degree or higher");
  });
});

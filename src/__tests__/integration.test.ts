/**
 * Integration tests covering critical end-to-end data flows and gap coverage.
 * TG14: fills gaps identified across TG1-TG13 test suites.
 */

import { describe, it, expect, vi } from "vitest";
import {
  estimatePoints,
  calcPointsSoFar,
  derivePartnerStatus,
  parseExperienceYears,
} from "@/lib/points-calculator";
import {
  getPossibilityRating,
  getPathwaySignal,
  getPrimaryList,
} from "@/lib/pathway-signals";
import { getStateEligibility } from "@/lib/state-nominations";
import { getEmployerEligibility } from "@/lib/employer-eligibility";
import {
  matchOccupations,
  keywordMatchOccupations,
  type MatchOccupationsRequest,
  type EnrichedOccupation,
} from "@/lib/occupation-matching";
import {
  generateFirstMessage,
  getDocumentTabs,
  type WorkspaceAssessmentData,
} from "@/lib/workspace-helpers";
import type { UserProfile, MatchResult, Occupation } from "@/types/assessment";
import type { StateNomination, AssessingBodyRequirement } from "@/types/database";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

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
    australianExperience: "0-1",
    experience: "0-1",
    jobDuties: "",
    englishScore: "Competent",
    naatiCcl: "No",
    professionalYear: "No",
    relationshipStatus: "Single",
    partnerSkills: "",
    partnerStatus: "Single",
    ...overrides,
  };
}

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

function buildMatchRequest(
  overrides: Partial<MatchOccupationsRequest> = {},
): MatchOccupationsRequest {
  return {
    fieldOfStudy: "Computer Science",
    jobTitle: "Software Developer",
    jobDuties: "Developing web applications and APIs using React and Node.js for enterprise clients",
    additionalFieldOfStudy: "",
    additionalDegreeLevel: "",
    additionalDegreeCountry: "",
    skillsOccupations: [
      "Software Engineer",
      "ICT Business Analyst",
      "Developer Programmer",
      "Database Administrator",
      "Systems Analyst",
    ],
    employerOccupations: [
      "Accountant (General)",
      "Civil Engineer",
      "Mechanical Engineer",
    ],
    ...overrides,
  };
}

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

/** Enriched occupations for the new matchOccupations signature. */
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

const ACS_BODY: AssessingBodyRequirement = {
  id: "abr-001",
  body_name: "ACS",
  required_documents: {
    types: [
      "employment_reference",
      "cv_resume",
      "statutory_declaration",
      "document_checklist",
    ],
  },
  duty_descriptors: {
    "261311": [
      "Designing, developing and maintaining software systems",
      "Testing, debugging and diagnosing software faults",
    ],
  },
  qualification_requirements: { minimum: "Bachelor in ICT" },
  experience_requirements: { ict_major: "2 years" },
  formatting_notes: "On company letterhead",
  conversation_template: {
    steps: [
      "Greet and confirm matched occupation",
      "Ask about ICT specialization (major/minor)",
    ],
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/* ------------------------------------------------------------------ */
/* E2E-1: Phase 1 happy path data flow                                */
/* ------------------------------------------------------------------ */

describe("E2E-1: Phase 1 Happy Path Data Flow", () => {
  it("form data flows through points calculation, occupation matching, and results structure", async () => {
    // Step 1: User fills stepper (simulated form data)
    const profile = buildProfile({
      age: 28,
      educationLevel: "Masters",
      fieldOfStudy: "Computer Science",
      countryOfEducation: "Australia",
      australianStudy: "Yes",
      workingSkilled: "Yes",
      jobTitle: "Software Engineer",
      australianExperience: "3-5",
      experience: "1-3",
      englishScore: "Proficient",
      naatiCcl: "No",
      professionalYear: "No",
      relationshipStatus: "Single",
      partnerStatus: "Single",
    });

    // Step 2: Points calculation
    const points = estimatePoints(profile);
    expect(points.age).toBe(30);
    expect(points.education).toBe(15);
    expect(points.australianStudy).toBe(5);
    expect(points.australianExperience).toBe(10);
    expect(points.offshoreExperience).toBe(0);
    expect(points.english).toBe(10);
    expect(points.partner).toBe(10);
    expect(points.total).toBe(80);

    // Step 3: Occupation matching (keyword fallback, no AI client)
    const matchResult = await matchOccupations(
      buildMatchRequest(),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      [],
      null,
      "claude-sonnet-4-6",
    );
    expect(matchResult.skillsMatches.length).toBe(3);
    expect(matchResult.employerMatches.length).toBe(2);
    for (const m of matchResult.skillsMatches) {
      expect(m).toHaveProperty("title");
      expect(m).toHaveProperty("score");
      expect(m).toHaveProperty("confidence");
      expect(m).toHaveProperty("reasoning");
    }

    // Step 4: Results structure - build occupation card data
    const topMatch = matchResult.skillsMatches[0];
    const occupationData: MatchResult = {
      title: topMatch.title,
      anzsco_code: "261313",
      confidence: topMatch.confidence,
      reasoning: topMatch.reasoning,
      experience_aligned: topMatch.experience_aligned,
      warnings: topMatch.warnings,
      score: topMatch.score,
      assessing_authority: "ACS",
      list: "MLTSSL",
      min_189_points: 65,
      latest_invitation: null,
    };

    // Step 5: Possibility rating
    const possibility = getPossibilityRating(points.total, 65, true);
    expect(possibility).toBe("High");

    // Step 6: State eligibility matrix
    const stateMatrix = getStateEligibility("261313", "Software Engineer", "MLTSSL", []);
    expect(stateMatrix).toHaveLength(8);

    // Step 7: Employer eligibility
    const auYears = parseExperienceYears(profile.australianExperience);
    const totalYears = auYears + parseExperienceYears(profile.experience);
    const employer = getEmployerEligibility(true, true, auYears, totalYears);
    expect(employer.visa_186.eligible).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* E2E-2: Phase 2 data flow                                           */
/* ------------------------------------------------------------------ */

describe("E2E-2: Phase 2 Data Flow", () => {
  it("assessment data flows into workspace context, first message, and document tabs", () => {
    // Simulate assessment data from Phase 1
    const assessmentData: WorkspaceAssessmentData = {
      assessmentId: "assess-001",
      occupationTitle: "Software Engineer",
      anzscoCode: "261313",
      assessingAuthority: "ACS",
      profileData: {
        firstName: "Alice",
        jobTitle: "Software Developer",
        fieldOfStudy: "Computer Science",
      },
      totalPoints: 85,
    };

    // Step 1: Generate first message from workspace context
    const firstMessage = generateFirstMessage(assessmentData, ACS_BODY);
    expect(firstMessage).toContain("Alice");
    expect(firstMessage).toContain("Software Engineer");
    expect(firstMessage).toContain("261313");
    expect(firstMessage).toContain("ACS");

    // Step 2: Document tabs match assessing body requirements
    const tabs = getDocumentTabs(ACS_BODY);
    expect(tabs).toHaveLength(4);
    expect(tabs).toContain("Employment Reference");

    // Step 3: Simulate chat message flow
    const messages = [
      { role: "assistant" as const, content: firstMessage },
      { role: "user" as const, content: "I worked at TechCorp for 3 years as a developer." },
    ];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("assistant");
    expect(messages[1].role).toBe("user");

    // Step 4: Simulate document update from chat
    const documentUpdate = {
      documentType: "employment_reference",
      content: JSON.stringify({
        employer: "TechCorp",
        position: "Software Developer",
        period: "2021-2024",
        duties: ["Designed and developed web applications"],
      }),
    };
    const parsedContent = JSON.parse(documentUpdate.content);
    expect(parsedContent.employer).toBe("TechCorp");
    expect(parsedContent.duties).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* E2E-3: Minimum input path                                          */
/* ------------------------------------------------------------------ */

describe("E2E-3: Minimum Input Path", () => {
  it("only required fields filled, all optional skipped, flow completes with correct points", async () => {
    // Minimum viable profile: skip optional pages/fields
    const minimalProfile = buildProfile({
      firstName: "Min",
      age: 30,
      visaStatus: "500",
      visaExpiry: "06/2027",
      educationLevel: "Diploma",
      fieldOfStudy: "Business",
      universityName: "",
      countryOfEducation: "Overseas",
      australianStudy: "No",
      regionalStudy: "No",
      additionalDegree: "None",
      additionalDegreeField: "",
      additionalDegreeCountry: "",
      workingSkilled: "No",
      jobTitle: "Business Analyst",
      australianExperience: "",
      experience: "",
      jobDuties: "",
      englishScore: "Competent",
      naatiCcl: "No",
      professionalYear: "No",
      relationshipStatus: "Single",
      partnerSkills: "",
      partnerStatus: "Single",
    });

    const points = estimatePoints(minimalProfile);
    // Age 30 = 30, Education Diploma = 10, English Competent = 0,
    // No experience = 0, Single = 10
    expect(points.age).toBe(30);
    expect(points.education).toBe(10);
    expect(points.english).toBe(0);
    expect(points.australianExperience).toBe(0);
    expect(points.offshoreExperience).toBe(0);
    expect(points.australianStudy).toBe(0);
    expect(points.regionalStudy).toBe(0);
    expect(points.naatiCcl).toBe(0);
    expect(points.professionalYear).toBe(0);
    expect(points.partner).toBe(10);
    expect(points.total).toBe(50);

    // Occupation matching still works with minimal input (50+ char jobDuties)
    const matchResult = await matchOccupations(
      buildMatchRequest({
        fieldOfStudy: "Business",
        jobTitle: "Business Analyst",
        jobDuties: "Analyzing business requirements and documenting specifications for enterprise systems",
        additionalFieldOfStudy: "",
      }),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      [],
      null,
      "claude-sonnet-4-6",
    );
    expect(matchResult.skillsMatches.length).toBeGreaterThan(0);
    expect(matchResult.employerMatches.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* E2E-4: AI failure graceful degradation                             */
/* ------------------------------------------------------------------ */

describe("E2E-4: AI Failure Graceful Degradation", () => {
  it("AI failure falls back to keyword matching without errors", async () => {
    const failingClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API timeout")),
      },
    };

    const result = await matchOccupations(
      buildMatchRequest(),
      CANONICAL_TITLES,
      ENRICHED_OCCUPATIONS,
      [],
      failingClient,
      "claude-sonnet-4-6",
    );

    // Must still return valid results
    expect(result).toBeDefined();
    expect(result.skillsMatches.length).toBe(3);
    expect(result.employerMatches.length).toBe(2);

    // Each match has required confidence-based properties
    for (const match of [...result.skillsMatches, ...result.employerMatches]) {
      expect(match).toHaveProperty("title");
      expect(match).toHaveProperty("score");
      expect(match).toHaveProperty("confidence");
      expect(match).toHaveProperty("reasoning");
      expect(match).toHaveProperty("warnings");
    }

    // No error should propagate to the caller
    expect(result.skillsMatches[0].title).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* PC-9: Education level points                                       */
/* ------------------------------------------------------------------ */

describe("PC-9: Education Level Points", () => {
  it("PhD=20, Masters=15, Bachelor=15, Diploma=10, Trade=10", () => {
    const educationExpectations: [string, number][] = [
      ["PhD", 20],
      ["Masters", 15],
      ["Bachelor", 15],
      ["Diploma", 10],
      ["Trade", 10],
    ];

    for (const [level, expectedPoints] of educationExpectations) {
      const profile = buildProfile({ educationLevel: level });
      const result = estimatePoints(profile);
      expect(result.education).toBe(expectedPoints);
    }
  });

  it("unknown or empty education level returns 0 points", () => {
    const result = estimatePoints(buildProfile({ educationLevel: "" }));
    expect(result.education).toBe(0);

    const result2 = estimatePoints(buildProfile({ educationLevel: "High School" }));
    expect(result2.education).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* PR-2, PR-3, PR-5: Possibility rating edge cases                    */
/* ------------------------------------------------------------------ */

describe("Possibility Rating Edge Cases", () => {
  it("PR-2: Medium when points meet threshold but NOT on MLTSSL", () => {
    // Points >= threshold but occupation is CSOL only
    const rating = getPossibilityRating(75, 65, false);
    expect(rating).toBe("Medium");

    const rating2 = getPossibilityRating(65, 65, false);
    expect(rating2).toBe("Medium");
  });

  it("PR-3: Medium when on MLTSSL but points below threshold", () => {
    // On MLTSSL but points below threshold
    const rating = getPossibilityRating(50, 65, true);
    expect(rating).toBe("Medium");

    const rating2 = getPossibilityRating(60, 65, true);
    expect(rating2).toBe("Medium");
  });

  it("PR-5: Medium when on MLTSSL but min_189_points is null", () => {
    // MLTSSL occupation but no threshold data
    const rating = getPossibilityRating(50, null, true);
    expect(rating).toBe("Medium");

    const rating2 = getPossibilityRating(100, null, true);
    expect(rating2).toBe("Medium");
  });
});

/* ------------------------------------------------------------------ */
/* ES-3: Visa 186 ineligible (CSOL only, even with experience)        */
/* ------------------------------------------------------------------ */

describe("ES-3: Visa 186 Ineligible (CSOL Only)", () => {
  it("CSOL-only occupation with ample experience is still ineligible for 186", () => {
    const result = getEmployerEligibility(false, true, 10, 15);
    expect(result.visa_186.eligible).toBe(false);
    expect(result.visa_186.reason).toContain("not on the MLTSSL");

    // But should still be eligible for 482
    expect(result.visa_482.eligible).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* SN remaining: QLD, SA, TAS code matching                           */
/* ------------------------------------------------------------------ */

describe("State Nomination: QLD, SA, TAS Code Matching", () => {
  it("QLD matches by ANZSCO code for 190 and 491 separately", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "QLD",
        anzsco_code: "261313",
        occupation_title: "Software Engineer",
        visa_190: "Yes",
        visa_491: "No",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const qld = result.find((s) => s.state === "QLD");
    expect(qld).toBeDefined();
    expect(qld!.visa_190).toBe(true);
    expect(qld!.visa_491).toBe(false);
  });

  it("QLD returns false when ANZSCO code not in nomination list", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "QLD",
        anzsco_code: "261312",
        visa_190: "Yes",
        visa_491: "Yes",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const qld = result.find((s) => s.state === "QLD");
    expect(qld!.visa_190).toBe(false);
    expect(qld!.visa_491).toBe(false);
  });

  it("SA matches by ANZSCO code for both visas", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "SA",
        anzsco_code: "261313",
        occupation_title: "Software Engineer",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const sa = result.find((s) => s.state === "SA");
    expect(sa).toBeDefined();
    expect(sa!.visa_190).toBe(true);
    expect(sa!.visa_491).toBe(true);
  });

  it("SA returns false for non-matching code", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "SA",
        anzsco_code: "999999",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const sa = result.find((s) => s.state === "SA");
    expect(sa!.visa_190).toBe(false);
    expect(sa!.visa_491).toBe(false);
  });

  it("TAS matches by ANZSCO code for both visas", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "TAS",
        anzsco_code: "261313",
        occupation_title: "Software Engineer",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const tas = result.find((s) => s.state === "TAS");
    expect(tas).toBeDefined();
    expect(tas!.visa_190).toBe(true);
    expect(tas!.visa_491).toBe(true);
  });

  it("TAS returns false for non-matching code", () => {
    const nominations: StateNomination[] = [
      buildNomination({
        state: "TAS",
        anzsco_code: "000000",
      }),
    ];

    const result = getStateEligibility("261313", "Software Engineer", "MLTSSL", nominations);
    const tas = result.find((s) => s.state === "TAS");
    expect(tas!.visa_190).toBe(false);
    expect(tas!.visa_491).toBe(false);
  });
});

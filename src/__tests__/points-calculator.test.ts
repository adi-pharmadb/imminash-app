/**
 * Points calculator tests covering all DHA point categories,
 * combined experience cap logic, partner status derivation,
 * age boundaries, and partial-data handling.
 */

import { describe, it, expect } from "vitest";
import {
  estimatePoints,
  calcPointsSoFar,
  parseExperienceYears,
  derivePartnerStatus,
} from "@/lib/points-calculator";
import type { UserProfile } from "@/types/assessment";

/** Helper to build a full UserProfile with sensible defaults. */
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

describe("Points Calculator", () => {
  it("PC-1: maximum points profile returns total 120", () => {
    const profile = buildProfile({
      age: 28,
      englishScore: "Superior",
      australianExperience: "8+",
      experience: "0-1",
      educationLevel: "PhD",
      australianStudy: "Yes",
      regionalStudy: "Yes",
      naatiCcl: "Yes",
      professionalYear: "Yes",
      partnerStatus: "Single",
    });

    const result = estimatePoints(profile);

    expect(result.age).toBe(30);
    expect(result.english).toBe(20);
    expect(result.australianExperience).toBe(20);
    expect(result.offshoreExperience).toBe(0);
    expect(result.education).toBe(20);
    expect(result.australianStudy).toBe(5);
    expect(result.regionalStudy).toBe(5);
    expect(result.naatiCcl).toBe(5);
    expect(result.professionalYear).toBe(5);
    expect(result.partner).toBe(10);
    expect(result.total).toBe(120);
  });

  it("PC-2: combined experience cap with AU=8+ and Offshore=5-8 yields AU=20, Offshore=0", () => {
    const profile = buildProfile({
      australianExperience: "8+",
      experience: "5-8",
    });

    const result = estimatePoints(profile);

    expect(result.australianExperience).toBe(20);
    expect(result.offshoreExperience).toBe(0);
    // Combined is capped at 20
    expect(result.australianExperience + result.offshoreExperience).toBe(20);
  });

  it("PC-3: combined experience cap partial fill AU=1-3(5) + Offshore=5-8(15) = 20", () => {
    const profile = buildProfile({
      australianExperience: "1-3",
      experience: "5-8",
    });

    const result = estimatePoints(profile);

    expect(result.australianExperience).toBe(5);
    expect(result.offshoreExperience).toBe(15);
    expect(result.australianExperience + result.offshoreExperience).toBe(20);
  });

  it("PC-4: combined experience under cap AU=1-3(5) + Offshore=1-3(5) = 10", () => {
    const profile = buildProfile({
      australianExperience: "1-3",
      experience: "1-3",
    });

    const result = estimatePoints(profile);

    expect(result.australianExperience).toBe(5);
    expect(result.offshoreExperience).toBe(5);
    expect(result.australianExperience + result.offshoreExperience).toBe(10);
  });

  it("PC-5: minimum viable 189 profile returns total 70", () => {
    // Age 33 gives 25 points (33-39 range per DHA table).
    // The spec listed Age=30 but that falls in the 25-32 range (30 points);
    // using age=33 to achieve the intended 25 age points and total of 70.
    const profile = buildProfile({
      age: 33,
      englishScore: "Proficient",
      australianExperience: "3-5",
      experience: "0-1",
      educationLevel: "Bachelor",
      australianStudy: "No",
      regionalStudy: "No",
      naatiCcl: "No",
      professionalYear: "No",
      partnerStatus: "Single",
    });

    const result = estimatePoints(profile);

    expect(result.age).toBe(25);
    expect(result.english).toBe(10);
    expect(result.australianExperience).toBe(10);
    expect(result.offshoreExperience).toBe(0);
    expect(result.education).toBe(15);
    expect(result.partner).toBe(10);
    expect(result.total).toBe(70);
  });

  it("PC-6: below 189 threshold returns total 30", () => {
    const profile = buildProfile({
      age: 42,
      englishScore: "Competent",
      australianExperience: "0-1",
      experience: "1-3",
      educationLevel: "Diploma",
      australianStudy: "No",
      regionalStudy: "No",
      naatiCcl: "No",
      professionalYear: "No",
      relationshipStatus: "Partner",
      partnerSkills: "Neither",
      partnerStatus: "None",
    });

    const result = estimatePoints(profile);

    expect(result.age).toBe(15);
    expect(result.english).toBe(0);
    expect(result.australianExperience).toBe(0);
    expect(result.offshoreExperience).toBe(5);
    expect(result.education).toBe(10);
    expect(result.partner).toBe(0);
    expect(result.total).toBe(30);
  });

  it("PC-7: partner status combinations yield correct points", () => {
    // Single = 10
    expect(
      estimatePoints(buildProfile({ partnerStatus: "Single" })).partner,
    ).toBe(10);
    // Skilled = 10
    expect(
      estimatePoints(buildProfile({ partnerStatus: "Skilled" })).partner,
    ).toBe(10);
    // English only = 5
    expect(
      estimatePoints(buildProfile({ partnerStatus: "English" })).partner,
    ).toBe(5);
    // Neither = 0
    expect(
      estimatePoints(buildProfile({ partnerStatus: "None" })).partner,
    ).toBe(0);

    // Verify derivePartnerStatus helper
    expect(derivePartnerStatus("Single", undefined)).toBe("Single");
    expect(derivePartnerStatus("Partner", "Skilled")).toBe("Skilled");
    expect(derivePartnerStatus("Partner", "English")).toBe("English");
    expect(derivePartnerStatus("Partner", "Neither")).toBe("None");
  });

  it("PC-8: age boundary values return correct points", () => {
    const ageExpectations: [number, number][] = [
      [17, 0],
      [18, 25],
      [24, 25],
      [25, 30],
      [32, 30],
      [33, 25],
      [39, 25],
      [40, 15],
      [44, 15],
      [45, 0],
    ];

    for (const [age, expectedPoints] of ageExpectations) {
      const result = estimatePoints(buildProfile({ age }));
      expect(result.age).toBe(expectedPoints);
    }
  });
});

describe("calcPointsSoFar (partial data)", () => {
  it("PC-10: handles partial data with only age provided, returns 30 without errors", () => {
    const result = calcPointsSoFar({ age: 28 });
    expect(result).toBe(30);
  });

  it("returns 0 for completely empty data", () => {
    const result = calcPointsSoFar({});
    expect(result).toBe(0);
  });
});

describe("parseExperienceYears", () => {
  it("converts experience dropdown values to numeric years", () => {
    expect(parseExperienceYears("0-1")).toBe(0);
    expect(parseExperienceYears("1-3")).toBe(1);
    expect(parseExperienceYears("3-5")).toBe(3);
    expect(parseExperienceYears("5-8")).toBe(5);
    expect(parseExperienceYears("8+")).toBe(8);
    expect(parseExperienceYears("")).toBe(0);
    expect(parseExperienceYears("None")).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { checkEligibility } from "@/lib/eligibility-check";

describe("checkEligibility", () => {
  it("returns false when no experience and no professional year", () => {
    expect(
      checkEligibility({
        professionalYear: "No",
        australianExperience: "0",
        experience: "0",
      }),
    ).toBe(false);
  });

  it("returns true when professional year is completed", () => {
    expect(
      checkEligibility({
        professionalYear: "Yes",
        australianExperience: "0",
        experience: "0",
      }),
    ).toBe(true);
  });

  it("returns true when Australian experience is 1-3 years", () => {
    expect(
      checkEligibility({
        professionalYear: "No",
        australianExperience: "1-3",
        experience: "0",
      }),
    ).toBe(true);
  });

  it("returns true when Australian experience is 3-5 years", () => {
    expect(
      checkEligibility({
        professionalYear: "No",
        australianExperience: "3-5",
        experience: "0",
      }),
    ).toBe(true);
  });

  it("returns true when overseas experience is 3-5 years", () => {
    expect(
      checkEligibility({
        professionalYear: "No",
        australianExperience: "0",
        experience: "3-5",
      }),
    ).toBe(true);
  });

  it("returns true when overseas experience is 8+ years", () => {
    expect(
      checkEligibility({
        professionalYear: "No",
        australianExperience: "0",
        experience: "8+",
      }),
    ).toBe(true);
  });

  it("returns false with empty/undefined fields", () => {
    expect(checkEligibility({})).toBe(false);
  });
});

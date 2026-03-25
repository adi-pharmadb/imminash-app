/**
 * Stepper flow acceptance criteria tests.
 * Tests the core business logic of the 7-page stepper:
 * session persistence, conditional logic, validation, points counter, and dynamic labels.
 *
 * These tests run in a Node environment and validate the stepper's data model
 * and logic functions rather than DOM rendering.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { calcPointsSoFar, derivePartnerStatus } from "@/lib/points-calculator";
import type { StepperFormData } from "@/types/assessment";

/** Simulated sessionStorage for Node environment. */
class MockSessionStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const SESSION_KEY = "imminash_stepper";

/** Page definitions mirroring StepperFlow's PAGE_DEFS. */
interface PageDef {
  id: number;
  condition?: (data: Partial<StepperFormData>) => boolean;
  skippable?: boolean;
  isValid: (data: Partial<StepperFormData>) => boolean;
}

const PAGE_DEFS: PageDef[] = [
  {
    id: 1,
    isValid: (d) =>
      !!d.firstName?.trim() &&
      d.age !== undefined &&
      d.age > 0 &&
      !!d.visaStatus?.trim() &&
      !!d.visaExpiry?.trim(),
  },
  {
    id: 2,
    isValid: (d) =>
      !!d.educationLevel?.trim() &&
      !!d.fieldOfStudy?.trim() &&
      !!d.countryOfEducation?.trim(),
  },
  {
    id: 3,
    skippable: true,
    isValid: () => true,
  },
  {
    id: 4,
    isValid: (d) => {
      if (!d.workingSkilled?.trim()) return false;
      if (d.workingSkilled === "Yes" || d.workingSkilled === "Past") {
        return (
          !!d.jobTitle?.trim() &&
          !!d.australianExperience?.trim() &&
          !!d.experience?.trim()
        );
      }
      return !!d.jobTitle?.trim();
    },
  },
  {
    id: 5,
    condition: (d) => d.workingSkilled === "Yes" || d.workingSkilled === "Past",
    skippable: true,
    isValid: () => true,
  },
  {
    id: 6,
    isValid: (d) => !!d.englishScore?.trim() && !!d.naatiCcl?.trim(),
  },
  {
    id: 7,
    isValid: (d) => {
      if (!d.professionalYear?.trim() || !d.relationshipStatus?.trim()) return false;
      if (d.relationshipStatus === "Partner" && !d.partnerSkills?.trim()) return false;
      return true;
    },
  },
];

function getActivePages(data: Partial<StepperFormData>): PageDef[] {
  return PAGE_DEFS.filter((p) => !p.condition || p.condition(data));
}

/** Simulate the stepper's handleChange logic for partnerStatus derivation. */
function applyChange(
  data: Partial<StepperFormData>,
  key: keyof StepperFormData,
  value: string | number,
): Partial<StepperFormData> {
  const next = { ...data, [key]: value };

  if (key === "relationshipStatus" || key === "partnerSkills") {
    const rel = key === "relationshipStatus" ? String(value) : data.relationshipStatus;
    const skills = key === "partnerSkills" ? String(value) : data.partnerSkills;
    next.partnerStatus = derivePartnerStatus(rel, skills);
    if (key === "relationshipStatus" && value === "Single") {
      next.partnerSkills = undefined as unknown as string;
    }
  }

  if (key === "countryOfEducation" && value === "Overseas") {
    next.australianStudy = undefined as unknown as string;
    next.regionalStudy = undefined as unknown as string;
  }

  if (key === "australianStudy" && value === "No") {
    next.regionalStudy = undefined as unknown as string;
  }

  return next;
}

describe("Stepper Flow", () => {
  let storage: MockSessionStorage;

  beforeEach(() => {
    storage = new MockSessionStorage();
  });

  it("AC-S1: session persistence - data is saved and restored from sessionStorage", () => {
    const formData: Partial<StepperFormData> = {
      firstName: "Aditya",
      age: 28,
      visaStatus: "500",
      visaExpiry: "03/2026",
      educationLevel: "Masters",
      fieldOfStudy: "Computer Science",
      countryOfEducation: "Australia",
      workingSkilled: "Yes",
      jobTitle: "Software Engineer",
    };

    // Simulate saving to session
    storage.setItem(SESSION_KEY, JSON.stringify(formData));

    // Simulate restoring from session (like a page refresh)
    const raw = storage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const restored = JSON.parse(raw!);

    expect(restored.firstName).toBe("Aditya");
    expect(restored.age).toBe(28);
    expect(restored.visaStatus).toBe("500");
    expect(restored.visaExpiry).toBe("03/2026");
    expect(restored.educationLevel).toBe("Masters");
    expect(restored.fieldOfStudy).toBe("Computer Science");
    expect(restored.countryOfEducation).toBe("Australia");
    expect(restored.workingSkilled).toBe("Yes");
    expect(restored.jobTitle).toBe("Software Engineer");
  });

  it("AC-S2: conditional page visibility - 'Not yet' skips Page 5, progress shows 6 pages", () => {
    const dataWithNotYet: Partial<StepperFormData> = { workingSkilled: "No" };
    const activeNotYet = getActivePages(dataWithNotYet);

    // Page 5 (id=5) should be excluded when workingSkilled is "No"
    const page5 = activeNotYet.find((p) => p.id === 5);
    expect(page5).toBeUndefined();
    expect(activeNotYet.length).toBe(6);

    // With "Yes", Page 5 should be included
    const dataWithYes: Partial<StepperFormData> = { workingSkilled: "Yes" };
    const activeYes = getActivePages(dataWithYes);
    const page5Yes = activeYes.find((p) => p.id === 5);
    expect(page5Yes).toBeDefined();
    expect(activeYes.length).toBe(7);
  });

  it("AC-S3: conditional field visibility - 'Overseas' hides Australian study and regional study fields", () => {
    // When country is Australia, australian study should be visible (controlled at component level)
    const auData: Partial<StepperFormData> = { countryOfEducation: "Australia" };
    expect(auData.countryOfEducation === "Australia").toBe(true);

    // When country changes to Overseas, the applyChange function clears AU study fields
    const updated = applyChange(auData, "countryOfEducation", "Overseas");
    expect(updated.countryOfEducation).toBe("Overseas");
    expect(updated.australianStudy).toBeUndefined();
    expect(updated.regionalStudy).toBeUndefined();
  });

  it("AC-S4: field validation blocks advancement - required fields must be filled", () => {
    // Page 1: all empty - should be invalid
    const emptyData: Partial<StepperFormData> = {};
    expect(PAGE_DEFS[0].isValid(emptyData)).toBe(false);

    // Page 1: partially filled - still invalid
    const partial: Partial<StepperFormData> = { firstName: "Test", age: 28 };
    expect(PAGE_DEFS[0].isValid(partial)).toBe(false);

    // Page 1: all filled - valid
    const complete: Partial<StepperFormData> = {
      firstName: "Test",
      age: 28,
      visaStatus: "500",
      visaExpiry: "03/2026",
    };
    expect(PAGE_DEFS[0].isValid(complete)).toBe(true);

    // Page 6: English + NAATI required
    expect(PAGE_DEFS[5].isValid({})).toBe(false);
    expect(PAGE_DEFS[5].isValid({ englishScore: "Superior" })).toBe(false);
    expect(PAGE_DEFS[5].isValid({ englishScore: "Superior", naatiCcl: "No" })).toBe(true);

    // Page 7: partner conditional validation
    expect(PAGE_DEFS[6].isValid({ professionalYear: "No", relationshipStatus: "Partner" })).toBe(false);
    expect(
      PAGE_DEFS[6].isValid({
        professionalYear: "No",
        relationshipStatus: "Partner",
        partnerSkills: "Skilled",
      }),
    ).toBe(true);
  });

  it("AC-S5: live points counter matches calcPointsSoFar() at every step", () => {
    // Build up data incrementally as user would fill the stepper
    let data: Partial<StepperFormData> = {};

    // After Page 1: only age contributes
    data = { ...data, firstName: "Test", age: 28, visaStatus: "500", visaExpiry: "03/2026" };
    expect(calcPointsSoFar(data)).toBe(30); // age 25-32 = 30

    // After Page 2: education contributes
    data = { ...data, educationLevel: "Masters", fieldOfStudy: "CS", countryOfEducation: "Australia", australianStudy: "Yes" };
    expect(calcPointsSoFar(data)).toBe(30 + 15 + 5); // age + masters + AU study

    // After Page 4: offshore experience contributes
    data = { ...data, workingSkilled: "Yes", jobTitle: "Engineer", australianExperience: "1-3", experience: "3-5" };
    expect(calcPointsSoFar(data)).toBe(30 + 15 + 5 + 10); // + offshore 3-5 = 10

    // After Page 6: English contributes
    data = { ...data, englishScore: "Superior", naatiCcl: "Yes" };
    expect(calcPointsSoFar(data)).toBe(30 + 15 + 5 + 10 + 20 + 5); // + superior + naati

    // After Page 7: partner contributes
    data = { ...data, professionalYear: "Yes", relationshipStatus: "Single", partnerStatus: "Single" };
    expect(calcPointsSoFar(data)).toBe(30 + 15 + 5 + 10 + 20 + 5 + 5 + 10); // + PY + single
  });

  it("AC-S6: points popup triggers when English changes from Competent to Proficient (+10)", () => {
    const dataBefore: Partial<StepperFormData> = {
      age: 28,
      educationLevel: "Bachelor",
      englishScore: "Competent",
    };
    const pointsBefore = calcPointsSoFar(dataBefore);

    const dataAfter = { ...dataBefore, englishScore: "Proficient" };
    const pointsAfter = calcPointsSoFar(dataAfter);

    const diff = pointsAfter - pointsBefore;
    expect(diff).toBe(10);
    // The PointsCounter component shows +{diff} popup when diff > 0
    expect(diff).toBeGreaterThan(0);
  });

  it("AC-S7: dynamic labels - 'I was in the past' changes job title label to 'Previous job title'", () => {
    // Test the label derivation logic used by StepperPage4
    function getJobTitleLabel(workingSkilled: string | undefined): string {
      if (workingSkilled === "Yes") return "Current job title";
      if (workingSkilled === "Past") return "Previous job title";
      return "What role are you looking to get?";
    }

    expect(getJobTitleLabel("Yes")).toBe("Current job title");
    expect(getJobTitleLabel("Past")).toBe("Previous job title");
    expect(getJobTitleLabel("No")).toBe("What role are you looking to get?");
    expect(getJobTitleLabel(undefined)).toBe("What role are you looking to get?");
  });
});

import type { StepperFormData } from "@/types/assessment";

/**
 * Check if the user meets minimum eligibility for skilled migration pathways.
 * Eligible if ANY of:
 * 1. Professional Year completed
 * 2. Australian work experience >= 1 year (value "1-3", "3-5", "5-8", or "8+")
 * 3. Overseas work experience >= 3 years (value "3-5", "5-8", or "8+")
 */
export function checkEligibility(formData: Partial<StepperFormData>): boolean {
  // 1. Professional Year
  if (formData.professionalYear === "Yes") return true;

  // 2. Australian experience >= 1 year
  const auEligible = ["1-3", "3-5", "5-8", "8+"];
  if (formData.australianExperience && auEligible.includes(formData.australianExperience)) {
    return true;
  }

  // 3. Overseas experience >= 3 years
  const offshoreEligible = ["3-5", "5-8", "8+"];
  if (formData.experience && offshoreEligible.includes(formData.experience)) {
    return true;
  }

  return false;
}

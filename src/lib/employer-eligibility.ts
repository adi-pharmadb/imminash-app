/**
 * Employer sponsored visa eligibility logic.
 * Rule-based checks for Visa 186 and Visa 482.
 */

export interface EmployerEligibility {
  visa_186: {
    eligible: boolean;
    reason: string;
  };
  visa_482: {
    eligible: boolean;
    reason: string;
  };
}

/**
 * Check employer sponsored visa eligibility.
 *
 * Visa 186 (Direct Entry): requires MLTSSL + 3+ years Australian experience [ES-1, ES-2, ES-3]
 * Visa 482 (Temporary Skill Shortage): requires CSOL + 1+ year total experience [ES-4, ES-5]
 *
 * @param isMltssl - whether occupation is on the MLTSSL
 * @param isCsol - whether occupation is on the CSOL
 * @param australianExperienceYears - minimum years of Australian experience
 * @param totalExperienceYears - minimum years of total experience (AU + offshore)
 */
export function getEmployerEligibility(
  isMltssl: boolean,
  isCsol: boolean,
  australianExperienceYears: number,
  totalExperienceYears: number,
): EmployerEligibility {
  // Visa 186: MLTSSL + 3+ years AU experience
  const visa186Eligible = isMltssl && australianExperienceYears >= 3;
  let visa186Reason: string;
  if (!isMltssl) {
    visa186Reason =
      "Occupation is not on the MLTSSL, which is required for Visa 186.";
  } else if (australianExperienceYears < 3) {
    visa186Reason =
      "Requires at least 3 years of Australian experience for Visa 186 Direct Entry stream.";
  } else {
    visa186Reason =
      "Eligible for Visa 186 Direct Entry stream with MLTSSL occupation and 3+ years Australian experience.";
  }

  // Visa 482: CSOL + 1+ year total experience
  const visa482Eligible = isCsol && totalExperienceYears >= 1;
  let visa482Reason: string;
  if (!isCsol) {
    visa482Reason =
      "Occupation is not on the CSOL, which is required for Visa 482.";
  } else if (totalExperienceYears < 1) {
    visa482Reason =
      "Requires at least 1 year of total experience for Visa 482.";
  } else {
    visa482Reason =
      "Eligible for Visa 482 Temporary Skill Shortage visa with CSOL occupation and sufficient experience.";
  }

  return {
    visa_186: { eligible: visa186Eligible, reason: visa186Reason },
    visa_482: { eligible: visa482Eligible, reason: visa482Reason },
  };
}

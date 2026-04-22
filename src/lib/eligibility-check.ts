import type { StepperFormData } from "@/types/assessment";
import type {
  EligibilityRules,
  EligibilityPredicate,
} from "@/types/database";

/**
 * Ordered bands used by `band_min` predicates. Index = rank, so
 * comparing ranks gives a >= test. Covers both the short-form values
 * (from StepperFormData, e.g. "1-3") and the DHA verbose band labels
 * (from ProjectedConversation.profile, e.g. "1 to less than 3 years")
 * so a single rules table works for both codepaths.
 */
const ORDERED_BANDS = [
  ["none", "None"],
  ["<1", "less than 1", "0 to less than 1 year"],
  ["1-3", "1 to less than 3 years", "0 to less than 3 years"],
  ["3-5", "3 to less than 5 years"],
  ["5-8", "5 to less than 8 years"],
  ["8+", "8+ years"],
];

function bandRank(value: string | undefined | null): number | null {
  if (!value) return null;
  const v = value.trim();
  for (let i = 0; i < ORDERED_BANDS.length; i++) {
    if (ORDERED_BANDS[i].some((alias) => alias.toLowerCase() === v.toLowerCase())) {
      return i;
    }
  }
  return null;
}

function matchesPredicate(
  profile: Record<string, unknown>,
  predicate: EligibilityPredicate,
): boolean {
  const value = profile[predicate.field];
  if ("equals" in predicate) {
    return value === predicate.equals;
  }
  if ("in" in predicate) {
    return predicate.in.some((v) => v === value);
  }
  if ("band_min" in predicate) {
    const valueRank = bandRank(typeof value === "string" ? value : null);
    const minRank = bandRank(predicate.band_min);
    if (valueRank === null || minRank === null) return false;
    return valueRank >= minRank;
  }
  return false;
}

/**
 * Generic evaluator. Takes a user profile and a set of body-specific
 * eligibility rules (from assessing_body_requirements.eligibility_rules)
 * and returns the action the agent should take: "paywall" (drive to
 * payment) or "calendly" (refer to a consultation).
 *
 * If `rules` is null (body has no rules row), falls back to the legacy
 * ACS-shaped rule so nothing regresses during rollout.
 */
export function evaluateEligibility(
  profile: Record<string, unknown> | null | undefined,
  rules: EligibilityRules | null | undefined,
): "paywall" | "calendly" {
  const p = profile ?? {};
  const effectiveRules: EligibilityRules = rules ?? LEGACY_ACS_RULES;
  const anyMatch = effectiveRules.paid_path_requires_any_of.some((pred) =>
    matchesPredicate(p, pred),
  );
  if (anyMatch) return "paywall";
  return effectiveRules.else_action;
}

const LEGACY_ACS_RULES: EligibilityRules = {
  paid_path_requires_any_of: [
    { field: "professionalYear", equals: "Yes" },
    { field: "australianExperience", band_min: "1-3" },
    { field: "experience", band_min: "3-5" },
  ],
  else_action: "calendly",
};

/**
 * Legacy stepper-form path: still used by the pre-chat form pipeline.
 * Delegates to the generic evaluator using the ACS rule set.
 */
export function checkEligibility(formData: Partial<StepperFormData>): boolean {
  return (
    evaluateEligibility(
      formData as Record<string, unknown>,
      LEGACY_ACS_RULES,
    ) === "paywall"
  );
}

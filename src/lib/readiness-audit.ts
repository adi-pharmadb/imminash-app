/**
 * Readiness audit: "will this application pass?" rule engine.
 *
 * Runs body-aware checks against the current conversation projection plus
 * the body's rules in `assessing_body_requirements` (eligibility_rules,
 * ui_config.primary_document_types, knowledge_md). Returns a verdict the
 * agent surfaces to the user via [READINESS_UPDATE] and that gates
 * [SUBMISSION_GUIDE_LINK] — no playbook is handed over until the verdict
 * is ready.
 *
 * Philosophy: checks are explicit rules, not probabilistic. A Medium
 * confidence verdict may still be "ready" if no blockers are present;
 * warnings carry nuance without blocking.
 */

import type { ProjectedConversation } from "./conversation-state";
import type {
  AssessingBodyRequirement,
  EligibilityRules,
} from "@/types/database";
import { evaluateEligibility } from "./eligibility-check";

export interface ReadinessBlocker {
  field: string;
  reason: string;
}

export interface ReadinessWarning {
  field: string;
  reason: string;
}

export interface ReadinessVerdict {
  ready: boolean;
  confidence: "High" | "Medium" | "Low";
  blockers: ReadinessBlocker[];
  warnings: ReadinessWarning[];
  estimatedOutcome:
    | "Positive"
    | "Positive with alternative ANZSCO"
    | "Insufficient"
    | "Too early";
  checkedAt: string;
}

interface RunInput {
  projection: ProjectedConversation;
  body: AssessingBodyRequirement | null;
}

/**
 * Required document types per body, read from ui_config.primary_document_types.
 * Each primary doc type must have at least one drafted, non-empty document
 * for the audit to pass.
 */
function getRequiredDocTypes(body: AssessingBodyRequirement | null): string[] {
  return body?.ui_config?.primary_document_types ?? [];
}

/**
 * For per-employer document types, verify that each employer mentioned in
 * the profile has a corresponding document drafted.
 */
function perEmployerDocTypes(): Set<string> {
  return new Set([
    "employment_reference",
    "statement_of_service",
    "msa_employer_template",
    "evidence_bundle",
    "statutory_declaration",
  ]);
}

function collectEmployers(projection: ProjectedConversation): string[] {
  const cv = (projection.cvData as Record<string, unknown> | null) ?? null;
  if (cv && Array.isArray(cv.experience)) {
    const employers: string[] = [];
    for (const exp of cv.experience as unknown[]) {
      if (exp && typeof exp === "object") {
        const e = (exp as Record<string, unknown>).employer;
        if (typeof e === "string" && e.trim()) employers.push(e.trim());
      }
    }
    if (employers.length > 0) return employers;
  }
  const inferred = new Set<string>();
  for (const doc of projection.documents) {
    if (perEmployerDocTypes().has(doc.document_type)) {
      const title = doc.title || "";
      const m = title.match(/\u2014\s*(.+)$/) || title.match(/-\s*(.+)$/);
      if (m?.[1]) inferred.add(m[1].trim());
    }
  }
  return Array.from(inferred);
}

function docsByType(projection: ProjectedConversation, type: string) {
  return projection.documents.filter((d) => d.document_type === type);
}

export function runReadinessAudit({
  projection,
  body,
}: RunInput): ReadinessVerdict {
  const blockers: ReadinessBlocker[] = [];
  const warnings: ReadinessWarning[] = [];
  const profile = (projection.profile ?? {}) as Record<string, unknown>;

  // Document completeness --------------------------------------------------
  const requiredTypes = getRequiredDocTypes(body);
  const perEmployer = perEmployerDocTypes();
  const employers = collectEmployers(projection);

  for (const type of requiredTypes) {
    const docs = docsByType(projection, type);
    if (docs.length === 0) {
      blockers.push({
        field: `documents.${type}`,
        reason: `Required document type ${type} is not drafted yet.`,
      });
      continue;
    }
    if (perEmployer.has(type) && employers.length > 0) {
      const missing = employers.filter(
        (emp) =>
          !docs.some((d) =>
            (d.title || "").toLowerCase().includes(emp.toLowerCase()),
          ),
      );
      for (const emp of missing) {
        blockers.push({
          field: `documents.${type}:${emp}`,
          reason: `Missing ${type} for employer "${emp}".`,
        });
      }
    }
    const unapproved = docs.filter((d) => d.status === "draft").length;
    if (unapproved > 0 && docs.every((d) => d.status === "draft")) {
      warnings.push({
        field: `documents.${type}`,
        reason: `${unapproved} ${type} document(s) still in draft status; approve before filing.`,
      });
    }
  }

  // Eligibility ------------------------------------------------------------
  const rules = (body?.eligibility_rules ?? null) as EligibilityRules | null;
  const decision = evaluateEligibility(profile, rules);
  if (decision !== "paywall") {
    blockers.push({
      field: "eligibility",
      reason: `Profile does not meet ${body?.body_name ?? "the body"}'s paid-path rule; consultation recommended instead of filing.`,
    });
  }

  // Profile completeness ---------------------------------------------------
  const missingProfile: string[] = [];
  const REQUIRED_PROFILE_FIELDS = [
    "firstName",
    "age",
    "visaStatus",
    "educationLevel",
    "englishScore",
    "experience",
  ];
  for (const f of REQUIRED_PROFILE_FIELDS) {
    const v = profile[f];
    if (v === undefined || v === null || v === "") missingProfile.push(f);
  }
  if (missingProfile.length > 0) {
    blockers.push({
      field: "profile",
      reason: `Missing required profile fields: ${missingProfile.join(", ")}.`,
    });
  }

  // CV --------------------------------------------------------------------
  if (!projection.cvData) {
    warnings.push({
      field: "cv",
      reason: "No CV uploaded. Assessors expect a structured CV alongside reference letters; upload for a stronger application.",
    });
  }

  // Match -----------------------------------------------------------------
  if (projection.matches.length === 0) {
    blockers.push({
      field: "matches",
      reason: "No ANZSCO occupation matched. Cannot file without a nominated occupation.",
    });
  }

  // Body-specific sanity checks -------------------------------------------
  const bodyName = body?.body_name ?? "";
  if (bodyName === "Engineers Australia") {
    const episodes = docsByType(projection, "career_episode");
    if (episodes.length < 3) {
      blockers.push({
        field: "documents.career_episode",
        reason: `Engineers Australia CDR requires exactly three Career Episodes; ${episodes.length} drafted so far.`,
      });
    }
    if (episodes.length > 0) {
      warnings.push({
        field: "documents.career_episode",
        reason: "Plagiarism in the CDR results in a permanent ban from EA assessment. Confirm every paragraph is written in your own words.",
      });
    }
    const summary = docsByType(projection, "summary_statement");
    if (summary.length === 0) {
      blockers.push({
        field: "documents.summary_statement",
        reason: "Engineers Australia CDR requires a Summary Statement mapping competency elements to Career Episode paragraphs.",
      });
    }
    const cpd = docsByType(projection, "cpd_log");
    if (cpd.length === 0) {
      warnings.push({
        field: "documents.cpd_log",
        reason: "EA expects a CPD log covering the last 12 months. Add one before filing.",
      });
    }
  }

  if (bodyName === "ACS") {
    for (const doc of docsByType(projection, "employment_reference")) {
      const c = (doc.content as Record<string, unknown>) ?? {};
      const duties = Array.isArray(c.duties) ? (c.duties as unknown[]) : [];
      if (duties.length < 6) {
        warnings.push({
          field: `documents.employment_reference:${doc.title}`,
          reason: `ACS expects 6-8 ICT-specific duty statements per role; ${doc.title} has ${duties.length}.`,
        });
      }
    }
  }

  if (bodyName === "TRA") {
    const evidence = docsByType(projection, "evidence_bundle");
    if (evidence.length === 0) {
      blockers.push({
        field: "documents.evidence_bundle",
        reason: "TRA requires evidence-of-employment corroboration (PAYG, super, tax records, contracts) beyond the reference letter alone.",
      });
    }
  }

  // Experience threshold check --------------------------------------------
  const experienceBand = String(profile.experience ?? "").toLowerCase();
  const auBand = String(profile.australianExperience ?? "").toLowerCase();
  const weakExperience =
    !experienceBand.includes("3 to less than 5") &&
    !experienceBand.includes("5 to less than 8") &&
    !experienceBand.includes("8+") &&
    !auBand.includes("1 to less than 3") &&
    !auBand.includes("3 to less than 5") &&
    !auBand.includes("5 to less than 8") &&
    !auBand.includes("8+");
  if (weakExperience && profile.professionalYear !== "Yes") {
    warnings.push({
      field: "experience",
      reason: "Experience is on the thin side for a positive outcome; marginal applicants should expect a longer assessment timeline and possible insufficient outcome.",
    });
  }

  // Estimated outcome + confidence ----------------------------------------
  let estimatedOutcome: ReadinessVerdict["estimatedOutcome"] = "Positive";
  let confidence: ReadinessVerdict["confidence"] = "High";
  if (blockers.length > 0) {
    estimatedOutcome = "Too early";
    confidence = "Low";
  } else if (warnings.length >= 3) {
    estimatedOutcome = "Positive with alternative ANZSCO";
    confidence = "Medium";
  } else if (warnings.length > 0) {
    confidence = "Medium";
  }

  return {
    ready: blockers.length === 0,
    confidence,
    blockers,
    warnings,
    estimatedOutcome,
    checkedAt: new Date().toISOString(),
  };
}

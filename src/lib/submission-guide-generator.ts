/**
 * Submission guide content generator.
 *
 * Uses Claude + real data (assessing body requirements, agent knowledge,
 * matched occupation, profile, drafted documents) to produce a structured
 * submission guide. Output is persisted on conversations.submission_guide_data
 * so the /chat/submission-guide/[id] route renders from facts, not inferred
 * boilerplate.
 *
 * Contract: AI returns a single JSON object with the shape below (see
 * SubmissionGuideData). If the model hallucinates, the caller is expected
 * to log + fall back to a minimal safe shape — never render hardcoded prose.
 */

import { anthropic, AI_MODEL } from "@/lib/anthropic";
import type {
  AgentKnowledge,
  AssessingBodyRequirement,
} from "@/types/database";

export interface SubmissionGuideStep {
  /** Short imperative title, e.g. "Create your ACS online account". */
  title: string;
  /** One-line detail, 120 chars or less ideally. */
  detail: string;
}

export interface SubmissionGuideManifestItem {
  title: string;
  detail: string;
  /** "ready" when this user already has it; "needs-action" otherwise. */
  state: "ready" | "needs-action";
  /** If state is "ready" and the item is downloadable from this app, optional reference. */
  reference?: "employment_references" | "cv" | null;
}

export interface SubmissionGuideExternalLink {
  /** User-facing title. */
  title: string;
  /** Short description. */
  detail: string;
  /** Full URL. Must be the canonical official URL, not a guess. */
  href: string;
}

export interface SubmissionGuideData {
  /** Applicant display name used in the hero. */
  applicantName: string;
  /** e.g. "Software Engineer". */
  occupationTitle: string;
  /** ANZSCO code, possibly empty if match is still pending. */
  anzscoCode: string;
  /** e.g. "ACS", "Engineers Australia", "VETASSESS". */
  assessingBody: string;
  /** Plain-english turnaround statement; should NOT invent specifics. */
  turnaround: string;
  /** Plain-english fee statement; should NOT invent specifics. */
  feeNote: string;
  /** Ordered set of steps from "right now" to "invitation to apply". */
  timeline: SubmissionGuideStep[];
  /** Full list of documents this body expects. */
  manifest: SubmissionGuideManifestItem[];
  /** External URLs to authoritative portals. */
  links: SubmissionGuideExternalLink[];
  /** Bullet strengths (quoting real profile data). */
  strengths: string[];
  /** Watchpoints + risks. */
  watchpoints: string[];
  /** When this was generated. */
  generatedAt: string;
}

export interface GenerateSubmissionGuideInput {
  applicantName: string;
  anzscoCode: string;
  occupationTitle: string;
  assessingBody: string;
  profile: Record<string, unknown>;
  points: Record<string, unknown> | null;
  cvPresent: boolean;
  employmentReferencesCount: number;
  assessingBodyRequirements: AssessingBodyRequirement | null;
  agentKnowledge: AgentKnowledge | null;
}

const SYSTEM_INSTRUCTION = `You are imminash's submission guide generator for Australian skilled migration skills assessments.

Your job: take the facts provided below and emit a SINGLE JSON object that matches the schema at the bottom of this prompt. No markdown fences. No prose before or after. JSON only.

Rules:
1. Be specific and accurate. Use facts from the assessing body requirements and agent knowledge you were given. Do NOT invent fees, URLs, or timeframes — if the facts don't include them, say "Refer to the official portal".
2. Quote the user's real profile values (points, visa status, experience band) when forming strengths/watchpoints. Never fabricate metrics.
3. Timeline must be actionable, 5-7 steps, from "right now" to "invitation to apply". Each step is 1 imperative sentence title + 1 short detail sentence.
4. Manifest lists the documents THIS ASSESSING BODY requires. Use assessingBodyRequirements.required_documents as the source of truth. Mark items the user already has (employment references, CV) as "ready".
5. External links: include the official assessing body portal URL and SkillSelect (https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect). Do not fabricate deep-link URLs unless they're in the provided data.
6. Strengths and watchpoints: 2-4 bullets each. Quote real numbers from the profile/points input.
7. If information is missing, prefer under-promising over inventing. Say "Check the official portal" rather than making up numbers.

Output schema (TypeScript):
{
  applicantName: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingBody: string;
  turnaround: string;               // e.g. "Refer to ACS processing times at acs.org.au (typically 4-8 weeks)"
  feeNote: string;                  // e.g. "Refer to ACS fee schedule; verify before payment"
  timeline: Array<{ title: string; detail: string }>;
  manifest: Array<{ title: string; detail: string; state: "ready" | "needs-action"; reference?: "employment_references" | "cv" | null }>;
  links: Array<{ title: string; detail: string; href: string }>;
  strengths: string[];
  watchpoints: string[];
  generatedAt: string;              // ISO date
}
`;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch {
    // try to strip code fences
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateSubmissionGuide(
  input: GenerateSubmissionGuideInput,
): Promise<SubmissionGuideData> {
  const factsBlock = JSON.stringify(
    {
      applicantName: input.applicantName,
      occupationTitle: input.occupationTitle,
      anzscoCode: input.anzscoCode,
      assessingBody: input.assessingBody,
      profile: input.profile,
      points: input.points,
      cvPresent: input.cvPresent,
      employmentReferencesCount: input.employmentReferencesCount,
      assessingBodyRequirements: input.assessingBodyRequirements,
      agentKnowledge: input.agentKnowledge,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: SYSTEM_INSTRUCTION,
    messages: [
      {
        role: "user",
        content: `FACTS:\n${factsBlock}\n\nProduce the JSON submission guide now. JSON only.`,
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("submission guide generator returned non-JSON");
  }

  // Shallow validation + defaults
  const p = parsed as Record<string, unknown>;
  const guide: SubmissionGuideData = {
    applicantName:
      (typeof p.applicantName === "string" && p.applicantName) || input.applicantName,
    occupationTitle:
      (typeof p.occupationTitle === "string" && p.occupationTitle) ||
      input.occupationTitle,
    anzscoCode: (typeof p.anzscoCode === "string" && p.anzscoCode) || input.anzscoCode,
    assessingBody:
      (typeof p.assessingBody === "string" && p.assessingBody) || input.assessingBody,
    turnaround:
      (typeof p.turnaround === "string" && p.turnaround) ||
      `Refer to the ${input.assessingBody} portal for current processing times.`,
    feeNote:
      (typeof p.feeNote === "string" && p.feeNote) ||
      `Refer to the ${input.assessingBody} fee schedule on the official portal.`,
    timeline: Array.isArray(p.timeline)
      ? (p.timeline as unknown[])
          .map((t) => {
            if (!t || typeof t !== "object") return null;
            const r = t as Record<string, unknown>;
            const title = typeof r.title === "string" ? r.title : "";
            const detail = typeof r.detail === "string" ? r.detail : "";
            if (!title || !detail) return null;
            return { title, detail };
          })
          .filter((x): x is SubmissionGuideStep => x !== null)
      : [],
    manifest: Array.isArray(p.manifest)
      ? (p.manifest as unknown[])
          .map((m): SubmissionGuideManifestItem | null => {
            if (!m || typeof m !== "object") return null;
            const r = m as Record<string, unknown>;
            const title = typeof r.title === "string" ? r.title : "";
            const detail = typeof r.detail === "string" ? r.detail : "";
            const state: "ready" | "needs-action" =
              r.state === "ready" ? "ready" : "needs-action";
            const reference: "employment_references" | "cv" | null =
              r.reference === "employment_references" || r.reference === "cv"
                ? (r.reference as "employment_references" | "cv")
                : null;
            if (!title) return null;
            return { title, detail, state, reference };
          })
          .filter((x): x is SubmissionGuideManifestItem => x !== null)
      : [],
    links: Array.isArray(p.links)
      ? (p.links as unknown[])
          .map((l) => {
            if (!l || typeof l !== "object") return null;
            const r = l as Record<string, unknown>;
            const title = typeof r.title === "string" ? r.title : "";
            const detail = typeof r.detail === "string" ? r.detail : "";
            const href = typeof r.href === "string" ? r.href : "";
            if (!title || !href.startsWith("http")) return null;
            return { title, detail, href };
          })
          .filter((x): x is SubmissionGuideExternalLink => x !== null)
      : [],
    strengths: Array.isArray(p.strengths)
      ? (p.strengths as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : [],
    watchpoints: Array.isArray(p.watchpoints)
      ? (p.watchpoints as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : [],
    generatedAt: new Date().toISOString(),
  };

  return guide;
}

/**
 * Submission guide generators.
 *
 * Two paths live here:
 *
 * 1. buildSubmissionPlaybook(): the NEW deterministic generator. Reads the
 *    body's portal_schema + the user's projection + drafted documents and
 *    produces a structured per-step playbook the UI renders with per-field
 *    copy-to-clipboard buttons and per-slot file upload rows. No LLM call.
 *
 * 2. generateSubmissionGuide(): the LEGACY LLM-driven generator. Still
 *    used where portal_schema is not yet available for a body. Produces a
 *    narrative timeline + manifest. Kept as a fallback.
 *
 * The /chat/submission-guide/[id] route prefers (1) when portal_schema is
 * populated; falls back to (2) otherwise.
 */

import { anthropic, AI_MODEL } from "@/lib/anthropic";
import type {
  AgentKnowledge,
  AssessingBodyRequirement,
} from "@/types/database";
import type {
  ProjectedConversation,
  ConversationDocument,
} from "@/lib/conversation-state";

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

// =======================================================================
// Playbook generator (new) — portal_schema driven
// =======================================================================

export interface PlaybookField {
  key: string;
  label: string;
  value: string;
  type: string;
  copyable: boolean;
  required: boolean;
  notes?: string;
  options?: string[];
}

export interface PlaybookUpload {
  slot: string;
  label: string;
  filename: string;
  documentId?: string | null;
  required: boolean;
  conditional?: string;
  notes?: string;
}

export interface PlaybookStepInstance {
  key: string;
  label: string;
  fields: PlaybookField[];
  uploads: PlaybookUpload[];
}

export interface PlaybookStep {
  stepNumber: number;
  id: string;
  title: string;
  helper?: string;
  iterable?: string;
  fields?: PlaybookField[];
  uploads?: PlaybookUpload[];
  instances?: PlaybookStepInstance[];
  displayOnly?: boolean;
}

export interface SubmissionPlaybook {
  applicantName: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingBody: string;
  portalUrl: string;
  loginUrl?: string;
  fee: {
    amount: number | null;
    currency: string;
    asOf: string;
    category?: string;
    notes?: string;
  };
  postSubmission: {
    confirmationFormat: string;
    typicalWait: string;
    rfmiWindowDays?: number;
  };
  steps: PlaybookStep[];
  generatedAt: string;
}

function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

/**
 * Resolve a `source` expression from the portal_schema against the
 * current projection + iteration context. Supports:
 *   - "profile.<key>"
 *   - "match.<key>"            (first match)
 *   - "points.<key>"
 *   - "cv.<key>"
 *   - "documents.<type>[i].<field>" (when i = instance index)
 *   - "literal:<value>"
 *   - "computed.<fn>"
 * Returns "" for unknown sources.
 */
function resolveSource(
  source: unknown,
  ctx: {
    projection: ProjectedConversation;
    iterationIndex?: number;
    iterationItem?: Record<string, unknown>;
  },
): string {
  if (typeof source !== "string") return "";
  if (source.startsWith("literal:")) return source.slice("literal:".length);
  const { projection, iterationIndex, iterationItem } = ctx;
  const profile = asObj(projection.profile);
  const firstMatch = asObj((projection.matches?.[0] ?? null) as unknown);
  const points = asObj(projection.points);
  const cv = asObj(projection.cvData);

  if (source.startsWith("profile.")) {
    return asStr(profile[source.slice("profile.".length)]);
  }
  if (source.startsWith("match.")) {
    return asStr(firstMatch[source.slice("match.".length)]);
  }
  if (source.startsWith("points.")) {
    return asStr(points[source.slice("points.".length)]);
  }
  if (source.startsWith("cv.")) {
    // Paths like cv.qualifications[i].title
    const tail = source.slice("cv.".length);
    return drillPath(cv, tail, iterationIndex, iterationItem);
  }
  if (source.startsWith("documents.")) {
    const tail = source.slice("documents.".length);
    // documents.<type>[i].<field>
    const m = tail.match(/^([a-z_]+)(?:\[(\w+)\])?(?:\.(.+))?$/i);
    if (!m) return "";
    const [, type, idxRaw, fieldPath] = m;
    const docs = projection.documents.filter((d) => d.document_type === type);
    if (docs.length === 0) return "";
    const idx = idxRaw === "i" ? (iterationIndex ?? 0) : Number(idxRaw ?? 0);
    const doc = docs[idx] ?? null;
    if (!doc) return "";
    if (!fieldPath) return doc.title || "";
    return drillPath(asObj(doc.content), fieldPath, iterationIndex, iterationItem);
  }
  if (source.startsWith("computed.")) {
    const fn = source.slice("computed.".length);
    return runComputed(fn, { projection, profile, firstMatch, points, cv });
  }
  return "";
}

function drillPath(
  root: Record<string, unknown>,
  path: string,
  iterationIndex?: number,
  iterationItem?: Record<string, unknown>,
): string {
  // Path segments like "qualifications[i].title" -> ["qualifications", "[i]", "title"]
  const parts = path.split(".");
  let cursor: unknown = root;
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z_]+)(?:\[(\w+)\])?$/);
    if (!m) return "";
    const [, key, idx] = m;
    if (cursor && typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[key];
    } else return "";
    if (idx !== undefined) {
      if (!Array.isArray(cursor)) return "";
      const n = idx === "i" ? (iterationIndex ?? 0) : Number(idx);
      cursor = cursor[n];
    }
  }
  if (cursor && typeof cursor === "object" && !Array.isArray(cursor)) {
    // Already at an object leaf: try iterationItem fall-through
    if (iterationItem) return "";
  }
  return asStr(cursor);
}

function runComputed(
  fn: string,
  data: {
    projection: ProjectedConversation;
    profile: Record<string, unknown>;
    firstMatch: Record<string, unknown>;
    points: Record<string, unknown>;
    cv: Record<string, unknown>;
  },
): string {
  const { profile, firstMatch } = data;
  switch (fn) {
    case "full_name":
      return [asStr(profile.firstName), asStr(profile.middleName), asStr(profile.lastName)]
        .filter(Boolean)
        .join(" ");
    case "full_name_uppercase":
      return [asStr(profile.firstName), asStr(profile.middleName), asStr(profile.lastName)]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
    case "has_name_change":
      return asStr(profile.nameChange) === "Yes" ? "Yes" : "No";
    case "anzsco_primary_plus_alternates": {
      const code = asStr(firstMatch.anzsco_code);
      const title = asStr(firstMatch.title);
      return code ? `${code} ${title}`.trim() : title;
    }
    case "acs_skill_grades":
      return "See inline grid; pre-populated from duty analysis.";
    default:
      return "";
  }
}

function iterateCollection(
  projection: ProjectedConversation,
  iterableKind: string,
): Array<{ key: string; label: string; item: Record<string, unknown> }> {
  const cv = asObj(projection.cvData);
  if (iterableKind === "per-qualification") {
    const qs = Array.isArray(cv.qualifications) ? (cv.qualifications as unknown[]) : [];
    return qs.map((q, i) => {
      const r = asObj(q);
      const label = asStr(r.title) || `Qualification ${i + 1}`;
      return { key: `q${i + 1}`, label, item: r };
    });
  }
  if (iterableKind === "per-employer") {
    // Prefer CV.experience; fall back to reference-doc titles.
    const xs = Array.isArray(cv.experience) ? (cv.experience as unknown[]) : [];
    if (xs.length > 0) {
      return xs.map((x, i) => {
        const r = asObj(x);
        const label = asStr(r.employer) || `Employer ${i + 1}`;
        return { key: `e${i + 1}`, label, item: r };
      });
    }
    const refDocs = projection.documents.filter((d) =>
      ["employment_reference", "statement_of_service", "msa_employer_template"].includes(
        d.document_type,
      ),
    );
    return refDocs.map((d, i) => {
      const emp = asStr(asObj(d.content).employer) || d.title;
      return { key: `e${i + 1}`, label: emp, item: asObj(d.content) };
    });
  }
  return [];
}

function renderFilename(template: string, ctx: { label: string; seq: number }): string {
  return template
    .replace(/\{employer_slug\}|\{institution_slug\}/g, slugify(ctx.label))
    .replace(/\{seq\}/g, String(ctx.seq).padStart(2, "0"));
}

function docIdForSlot(
  projection: ProjectedConversation,
  source: unknown,
): string | null {
  if (typeof source !== "string") return null;
  if (!source.startsWith("documents.")) return null;
  const tail = source.slice("documents.".length);
  const m = tail.match(/^([a-z_]+)/i);
  if (!m) return null;
  const docs = projection.documents.filter((d) => d.document_type === m[1]);
  return docs[0]?.id ?? null;
}

function buildFieldsFor(
  rawFields: unknown[],
  ctx: {
    projection: ProjectedConversation;
    iterationIndex?: number;
    iterationItem?: Record<string, unknown>;
  },
): PlaybookField[] {
  const out: PlaybookField[] = [];
  for (const raw of rawFields) {
    const f = asObj(raw);
    const key = asStr(f.key);
    const label = asStr(f.label) || key;
    const type = asStr(f.type) || "text";
    const notes = asStr(f.notes) || undefined;
    const required = f.required === true;
    const options = Array.isArray(f.options)
      ? (f.options as unknown[]).filter((o): o is string => typeof o === "string")
      : undefined;
    const value = resolveSource(f.source, ctx);
    const copyable = type !== "display_only" && type !== "checkbox_list";
    out.push({ key, label, value, type, copyable, required, notes, options });
  }
  return out;
}

function buildUploadsFor(
  rawUploads: unknown[],
  ctx: {
    projection: ProjectedConversation;
    iterationIndex?: number;
    iterationLabel?: string;
    seqStart: number;
  },
): PlaybookUpload[] {
  const out: PlaybookUpload[] = [];
  let seq = ctx.seqStart;
  for (const raw of rawUploads) {
    const u = asObj(raw);
    const slot = asStr(u.slot);
    const label = asStr(u.label) || slot;
    const required = u.required === true;
    const conditional = asStr(u.conditional_on) || undefined;
    const notes = asStr(u.notes) || undefined;
    const template = asStr(u.filename_template) || `{seq}_${slug(slot)}.pdf`;
    const filename = renderFilename(template, {
      label: ctx.iterationLabel ?? slot,
      seq,
    });
    const documentId = docIdForSlot(ctx.projection, u.source);
    out.push({ slot, label, filename, documentId, required, conditional, notes });
    seq += 1;
  }
  return out;
}

function slug(s: string): string {
  return slugify(s);
}

/**
 * Build a structured submission playbook from portal_schema + projection
 * + documents. Pure function, no LLM, no network.
 */
export function buildSubmissionPlaybook(
  projection: ProjectedConversation,
  body: AssessingBodyRequirement | null,
): SubmissionPlaybook | null {
  if (!body?.portal_schema) return null;
  const schema = asObj(body.portal_schema);
  const rawSteps = Array.isArray(schema.steps) ? (schema.steps as unknown[]) : [];
  const firstMatch = asObj((projection.matches?.[0] ?? null) as unknown);
  const profile = asObj(projection.profile);
  const fee = asObj(schema.fee);
  const post = asObj(schema.post_submission);
  const applicantName = [asStr(profile.firstName), asStr(profile.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();

  const steps: PlaybookStep[] = [];
  let globalSeq = 1;
  for (const rawStep of rawSteps) {
    const s = asObj(rawStep);
    const stepNumber = typeof s.step_number === "number" ? s.step_number : steps.length + 1;
    const id = asStr(s.id);
    const title = asStr(s.title);
    const helper = asStr(s.helper) || undefined;
    const iterable = asStr(s.iterable) || undefined;
    const displayOnly = s.display_only === true;

    if (displayOnly) {
      steps.push({ stepNumber, id, title, helper, displayOnly: true });
      continue;
    }

    if (iterable) {
      const items = iterateCollection(projection, iterable);
      const instances: PlaybookStepInstance[] = items.map((it, i) => {
        const ctx = { projection, iterationIndex: i, iterationItem: it.item };
        const topFields =
          Array.isArray(s.fields) && (s.fields as unknown[]).length
            ? buildFieldsFor(s.fields as unknown[], ctx)
            : [];
        const iterableFields = Array.isArray(s.iterable_fields)
          ? buildFieldsFor(s.iterable_fields as unknown[], ctx)
          : [];
        const uploadsCtx = {
          projection,
          iterationIndex: i,
          iterationLabel: it.label,
          seqStart: globalSeq,
        };
        const topUploads = Array.isArray(s.uploads) ? buildUploadsFor(s.uploads as unknown[], uploadsCtx) : [];
        const iterableUploads = Array.isArray(s.iterable_uploads)
          ? buildUploadsFor(s.iterable_uploads as unknown[], uploadsCtx)
          : [];
        globalSeq += topUploads.length + iterableUploads.length;
        return {
          key: it.key,
          label: it.label,
          fields: [...topFields, ...iterableFields],
          uploads: [...topUploads, ...iterableUploads],
        };
      });
      steps.push({ stepNumber, id, title, helper, iterable, instances });
    } else {
      const ctx = { projection };
      const fields = Array.isArray(s.fields) ? buildFieldsFor(s.fields as unknown[], ctx) : [];
      const uploads = Array.isArray(s.uploads)
        ? buildUploadsFor(s.uploads as unknown[], {
            projection,
            seqStart: globalSeq,
          })
        : [];
      globalSeq += uploads.length;
      steps.push({ stepNumber, id, title, helper, fields, uploads });
    }
  }

  return {
    applicantName: applicantName || "Applicant",
    occupationTitle: asStr(firstMatch.title),
    anzscoCode: asStr(firstMatch.anzsco_code),
    assessingBody: body.body_name,
    portalUrl: asStr(schema.portal_url),
    loginUrl: asStr(schema.login_url) || undefined,
    fee: {
      amount: typeof fee.amount_aud === "number" ? fee.amount_aud : null,
      currency: "AUD",
      asOf: asStr(fee.as_of),
      category: asStr(fee.category) || undefined,
      notes: asStr(fee.category_reference) || undefined,
    },
    postSubmission: {
      confirmationFormat: asStr(post.confirmation_format),
      typicalWait: asStr(post.typical_wait),
      rfmiWindowDays:
        typeof post.rfmi_window_days === "number" ? post.rfmi_window_days : undefined,
    },
    steps,
    generatedAt: new Date().toISOString(),
  };
}

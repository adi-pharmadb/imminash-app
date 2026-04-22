/**
 * POST /api/chat
 *
 * Conversation-centric streaming chat endpoint for the unified
 * chat-first experience. Accepts a `conversationId` and a single
 * user message, loads the authed conversation row (RLS-enforced),
 * builds the unified system prompt, streams Anthropic with a
 * `match_occupations` tool, parses markers from the final assistant
 * text, and applies server-authoritative state mutations
 * (profile merge, points recompute, phase transitions).
 */

import { z } from "zod";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { buildUnifiedChatPrompt } from "@/lib/chat-prompt-unified";
import {
  projectConversation,
  type ConversationRow,
  type ChatMessage,
  type ConversationDocument,
} from "@/lib/conversation-state";
import { parseMarkers } from "@/lib/marker-parser";
import { estimatePoints } from "@/lib/points-calculator";
import {
  matchOccupations,
  type EnrichedOccupation,
} from "@/lib/occupation-matching";
import type {
  AssessingBodyRequirement,
  AgentKnowledge,
} from "@/types/database";
import type { UserProfile } from "@/types/assessment";

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

// Tool definition exposed to Claude. Wraps src/lib/occupation-matching.ts.
const MATCH_OCCUPATIONS_TOOL = {
  name: "match_occupations",
  description:
    "Match the user's profile to ANZSCO occupations. Call exactly once after the full Phase 1 flow is captured (age, visa status, qualification, onshore exp, offshore exp, english, job title + duties, professional year, australian study + regional study, NAATI/CCL, partner status).",
  input_schema: {
    type: "object" as const,
    properties: {
      fieldOfStudy: { type: "string", description: "Primary field of study, e.g. 'Computer Science'" },
      jobTitle: { type: "string", description: "Current or most recent job title" },
      jobDuties: { type: "string", description: "Free-text day-to-day duties, >= 50 chars" },
      additionalFieldOfStudy: { type: "string", description: "Optional additional qualification field" },
      additionalDegreeLevel: { type: "string", description: "Optional additional qualification level" },
      additionalDegreeCountry: { type: "string", description: "Optional additional qualification country" },
    },
    required: ["fieldOfStudy", "jobTitle", "jobDuties"],
  },
};

type SupabaseAuthed = Awaited<ReturnType<typeof createClient>>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid input", 400, parsed.error.flatten());
    }
    const { conversationId, message } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError("Unauthorized", 401);
    }

    // RLS will reject if not owner.
    const { data: rawRow, error: rowError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (rowError || !rawRow) {
      return jsonError("Conversation not found", 404);
    }

    const row = rawRow as unknown as ConversationRow;

    if (row.status === "done") {
      return jsonError("Conversation is done", 400);
    }

    // `__continue__` is a client-side sentinel posted after Stripe return.
    // Treat it as a system instruction, do NOT persist as a user message.
    const isContinue = message.trim() === "__continue__";

    if (!isContinue && row.status === "phase2" && !row.paid_at) {
      return jsonError("Phase 2 requires payment", 400);
    }

    // Build conversation projection + prompt.
    const projection = projectConversation(row);

    // Look up assessing body + descriptors for the primary matched ANZSCO.
    const assessingBody = await loadAssessingBody(supabase, projection);

    const systemBlocks = buildUnifiedChatPrompt(
      projection,
      assessingBody ?? undefined,
    );

    // Build the message history sent to Claude.
    const history: Array<{ role: "user" | "assistant"; content: any }> = (
      projection.messages ?? []
    )
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content ?? ""),
      }));

    if (isContinue) {
      history.push({
        role: "user",
        content:
          "[system] The user just completed payment. Begin Phase 2 now: emit the mandatory disclaimer and request the CV.",
      });
    } else {
      history.push({ role: "user", content: message });
    }

    // Stream Anthropic, handling tool_use mid-stream.
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          let turnMessages = history.slice();
          let safety = 0;

          // Loop to handle tool_use turns. Max 2 iterations (initial + 1 tool).
          while (safety < 3) {
            safety += 1;

            const stream = anthropic.messages.stream({
              model: AI_MODEL,
              max_tokens: 8192,
              system: systemBlocks,
              tools: [MATCH_OCCUPATIONS_TOOL],
              messages: turnMessages,
            });

            let toolUseId: string | null = null;
            let toolName: string | null = null;
            let toolInputRaw = "";
            let turnText = "";

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                const block = event.content_block;
                if (block && block.type === "tool_use") {
                  toolUseId = block.id;
                  toolName = block.name;
                  toolInputRaw = "";
                }
              } else if (event.type === "content_block_delta") {
                const delta = event.delta;
                if (delta.type === "text_delta") {
                  turnText += delta.text;
                  fullText += delta.text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "text", text: delta.text })}\n\n`,
                    ),
                  );
                } else if (delta.type === "input_json_delta") {
                  toolInputRaw += delta.partial_json;
                }
              }
            }

            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "tool_use" && toolUseId && toolName === "match_occupations") {
              // Run the tool, append tool_result, loop.
              let toolInput: Record<string, unknown> = {};
              try {
                toolInput = toolInputRaw ? JSON.parse(toolInputRaw) : {};
              } catch {
                toolInput = {};
              }

              const toolResult = await runMatchOccupationsTool(
                supabase,
                toolInput,
              );

              turnMessages = [
                ...turnMessages,
                {
                  role: "assistant",
                  content: finalMessage.content,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: toolUseId,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                },
              ];
              continue;
            }

            // No tool_use -> end of turn.
            void turnText;
            break;
          }

          // Parse markers, apply state, persist.
          const parsed = parseMarkers(fullText);
          console.log("[chat] marker parse", {
            convId: row.id,
            phase: row.status,
            profileUpdates: parsed.profileUpdates.length,
            docUpdates: parsed.docUpdates.length,
            docTypes: parsed.docUpdates.map((d) => `${d.type}:${d.employer ?? ""}`),
          });

          const persistResult = await persistTurn({
            supabase,
            row,
            isContinue,
            userMessage: message,
            assistantClean: parsed.cleanText,
            parsed,
          });

          // Emit ASK_CHOICE (ephemeral; not persisted, only this turn).
          if (parsed.askChoice) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "choice", choice: parsed.askChoice })}\n\n`,
              ),
            );
          }

          // Emit ASK_FORM (ephemeral).
          if (parsed.askForm) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "form", form: parsed.askForm })}\n\n`,
              ),
            );
          }

          // Emit ASK_FILE (ephemeral).
          if (parsed.askFile) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "file", file: parsed.askFile })}\n\n`,
              ),
            );
          }

          // Emit submission guide link (ephemeral signal for the client to
          // render a CTA below the message).
          if (parsed.hasSubmissionGuideLink) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "submission_guide_link", conversationId: row.id })}\n\n`,
              ),
            );
          }

          // Emit final state projection to the client.
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "state", state: persistResult.projection })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
          );
          controller.close();
        } catch (streamError) {
          console.error("chat stream error:", streamError);
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: "stream_failed" })}\n\n`,
              ),
            );
          } catch {
            // already closed
          }
          controller.error(streamError);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("chat route error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function jsonError(error: string, status: number, details?: unknown) {
  return new Response(
    JSON.stringify(details ? { error, details } : { error }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

async function loadAssessingBody(
  supabase: SupabaseAuthed,
  projection: ReturnType<typeof projectConversation>,
): Promise<AssessingBodyRequirement | null> {
  const matches = projection.matches;
  if (!matches.length) return null;

  // Prefer the selected ANZSCO if present, else first match.
  const selectedCode = projection.selectedAnzscoCode;
  let primary: Record<string, unknown> | null = null;
  if (selectedCode) {
    primary =
      (matches.find(
        (m) =>
          m &&
          typeof m === "object" &&
          ((m as Record<string, unknown>).anzsco_code === selectedCode ||
            (m as Record<string, unknown>).anzscoCode === selectedCode),
      ) as Record<string, unknown> | undefined) ?? null;
  }
  if (!primary && matches[0] && typeof matches[0] === "object") {
    primary = matches[0] as Record<string, unknown>;
  }
  if (!primary) return null;

  const assessingAuthority =
    (primary.assessing_authority as string) ||
    (primary.assessingAuthority as string) ||
    "";
  if (!assessingAuthority) return null;

  const { data } = await supabase
    .from("assessing_body_requirements")
    .select("*")
    .eq("body_name", assessingAuthority)
    .maybeSingle();

  return (data as AssessingBodyRequirement | null) ?? null;
}

async function runMatchOccupationsTool(
  supabase: SupabaseAuthed,
  input: Record<string, unknown>,
): Promise<unknown> {
  try {
    const { data: occupations } = await supabase
      .from("occupations")
      .select(
        "title, anzsco_code, assessing_authority, mltssl, stsol, csol, min_189_points, qualification_level_required, unit_group_description, industry_keywords",
      );
    const occupationList = occupations ?? [];
    const canonicalTitles = occupationList.map((o) => o.title);

    const enriched: EnrichedOccupation[] = occupationList.map((o) => ({
      title: o.title,
      anzsco_code: o.anzsco_code,
      unit_group_description: o.unit_group_description ?? null,
      industry_keywords: o.industry_keywords ?? null,
      qualification_level_required: o.qualification_level_required ?? null,
      mltssl: o.mltssl,
      stsol: o.stsol,
      csol: o.csol,
    }));

    const { data: agentKnowledgeData } = await supabase
      .from("agent_knowledge")
      .select("*");
    const agentKnowledge: AgentKnowledge[] =
      (agentKnowledgeData ?? []) as AgentKnowledge[];

    const normalized = {
      fieldOfStudy: String(input.fieldOfStudy ?? ""),
      jobTitle: String(input.jobTitle ?? ""),
      jobDuties: String(input.jobDuties ?? ""),
      additionalFieldOfStudy: String(input.additionalFieldOfStudy ?? ""),
      additionalDegreeLevel: String(input.additionalDegreeLevel ?? ""),
      additionalDegreeCountry: String(input.additionalDegreeCountry ?? ""),
      skillsOccupations: [] as string[],
      employerOccupations: [] as string[],
    };

    const result = await matchOccupations(
      normalized,
      canonicalTitles,
      enriched,
      agentKnowledge,
      anthropic,
      AI_MODEL,
    );

    // Enrich with anzsco_code + assessing_authority so the model can reference them.
    const byTitle = new Map(
      occupationList.map((o) => [o.title.toLowerCase().trim(), o]),
    );
    const enrich = (m: { title: string; confidence: number; reasoning: string; warnings: string[] }) => {
      const occ = byTitle.get(m.title.toLowerCase().trim());
      return {
        title: m.title,
        anzsco_code: occ?.anzsco_code ?? "",
        assessing_authority: occ?.assessing_authority ?? null,
        confidence: m.confidence,
        reasoning: m.reasoning,
        warnings: m.warnings,
      };
    };
    return {
      skillsMatches: result.skillsMatches.map(enrich),
      employerMatches: result.employerMatches.map(enrich),
    };
  } catch (err) {
    console.error("match_occupations tool error:", err);
    return { skillsMatches: [], employerMatches: [], error: "tool_failed" };
  }
}

interface PersistArgs {
  supabase: SupabaseAuthed;
  row: ConversationRow;
  isContinue: boolean;
  userMessage: string;
  assistantClean: string;
  parsed: ReturnType<typeof parseMarkers>;
}

async function persistTurn(args: PersistArgs) {
  const { supabase, row, isContinue, userMessage, assistantClean, parsed } = args;

  // Merge profile patches (last write wins per key).
  const mergedProfile: Record<string, unknown> = { ...(row.profile_data ?? {}) };
  let profileChanged = false;
  for (const patch of parsed.profileUpdates) {
    for (const [k, v] of Object.entries(patch)) {
      mergedProfile[k] = v;
      profileChanged = true;
    }
  }

  // Recompute points server-side if relevant.
  let newPoints: Record<string, unknown> | null =
    (row.points_breakdown as Record<string, unknown> | null) ?? null;
  if (parsed.pointsUpdate || profileChanged) {
    try {
      const coerced = coerceProfileToUserProfile(mergedProfile);
      if (coerced) {
        newPoints = estimatePoints(coerced) as unknown as Record<string, unknown>;
      }
    } catch (err) {
      console.error("points recompute failed:", err);
    }
  }

  // Matches.
  let newMatches: unknown = row.matched_occupations;
  if (parsed.matchUpdate) {
    newMatches = parsed.matchUpdate;
  }

  // Phase transitions.
  let newStatus = row.status;

  const hasPoints = !!(newPoints && typeof newPoints === "object");
  const hasMatches =
    (parsed.matchUpdate && Object.keys(parsed.matchUpdate).length > 0) ||
    (Array.isArray(newMatches) && newMatches.length > 0) ||
    (newMatches && typeof newMatches === "object");

  if (parsed.hasPaywall) {
    if (newStatus === "phase1" && hasPoints && hasMatches) {
      newStatus = "awaiting_payment";
    }
    // Ordering violated -> silently ignore.
  }

  if (parsed.hasCalendly && newStatus === "phase1") {
    newStatus = "done";
  }

  if (newStatus === "paid" && parsed.docUpdates.length > 0) {
    newStatus = "phase2";
  }

  // Phase 2 wrap-up: model emits [CONVERSATION_DONE] when the user signals
  // they're finished and has what they need.
  if (parsed.hasConversationDone && (newStatus === "phase2" || newStatus === "paid")) {
    newStatus = "done";
  }

  // Append messages jsonb.
  const existingMessages: ChatMessage[] = Array.isArray(row.messages)
    ? (row.messages as ChatMessage[])
    : [];
  const nextMessages: ChatMessage[] = [...existingMessages];
  if (!isContinue) {
    nextMessages.push({
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });
  }
  nextMessages.push({
    role: "assistant",
    content: assistantClean,
    createdAt: new Date().toISOString(),
  });

  const updatePayload: Record<string, unknown> = {
    messages: nextMessages,
    profile_data: mergedProfile,
    points_breakdown: newPoints,
    matched_occupations: newMatches,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("conversations")
    .update(updatePayload)
    .eq("id", row.id);

  // Doc updates -> documents table (employment_reference only).
  // Chat-first flow: documents are keyed by conversation_id (assessment_id
  // is nullable for conversations not yet linked to a legacy assessment).
  if (parsed.docUpdates.length > 0) {
    for (const doc of parsed.docUpdates) {
      if (doc.type !== "employment_reference") continue;
      const title = doc.employer
        ? `Employment Reference — ${doc.employer}`
        : "Employment Reference";
      const content =
        typeof doc.content === "object" && doc.content !== null
          ? (doc.content as Record<string, unknown>)
          : { raw: doc.content };

      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("conversation_id", row.id)
        .eq("document_type", "employment_reference")
        .eq("title", title)
        .maybeSingle();

      if (existing) {
        const { error: updErr } = await supabase
          .from("documents")
          .update({
            content,
            status: "draft",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updErr) console.error("[chat] doc update error", updErr);
      } else {
        const { error: insErr } = await supabase.from("documents").insert({
          conversation_id: row.id,
          assessment_id: row.assessment_id,
          user_id: row.user_id,
          document_type: "employment_reference",
          title,
          content,
          status: "draft",
        });
        if (insErr) console.error("[chat] doc insert error", insErr, { convId: row.id, title });
      }
    }
  }

  // Build updated projection for the client.
  const updatedRow: ConversationRow = {
    ...row,
    messages: nextMessages,
    profile_data: mergedProfile,
    points_breakdown: newPoints,
    matched_occupations: newMatches,
    status: newStatus,
  };

  // Fetch latest documents so the LiveSummaryPanel can render them.
  const { data: docs } = await supabase
    .from("documents")
    .select("id, document_type, title, status, content, created_at, updated_at")
    .eq("conversation_id", row.id)
    .order("created_at", { ascending: false });

  return {
    projection: projectConversation(
      updatedRow,
      (docs ?? []) as ConversationDocument[],
    ),
  };
}

/**
 * Best-effort coercion of the free-form profile_data jsonb into the
 * strictly-typed UserProfile expected by estimatePoints(). Unknown
 * fields fall back to empty strings so the calculator returns 0 for
 * that category rather than throwing.
 */
function coerceProfileToUserProfile(
  profile: Record<string, unknown>,
): UserProfile | null {
  const ageRaw = profile.age;
  const age = typeof ageRaw === "number" ? ageRaw : Number(ageRaw);
  if (!Number.isFinite(age)) return null;

  const str = (k: string): string => {
    const v = profile[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  };

  // Map common "band" labels from the unified prompt to the
  // calculator's legacy dropdown values.
  const mapExp = (v: string): string => {
    const s = v.toLowerCase();
    if (!s || s === "none") return "0";
    if (s.includes("0 to less than 3")) return "0-1";
    if (s.includes("1 to less than 3")) return "1-3";
    if (s.includes("3 to less than 5")) return "3-5";
    if (s.includes("5 to less than 8")) return "5-8";
    if (s.includes("8+")) return "8+";
    return v; // already in legacy form
  };

  // Map educationLevel synonyms to calculator's expected values.
  const mapEdu = (v: string): string => {
    const s = v.toLowerCase().trim();
    if (!s) return "";
    if (s.includes("phd") || s.includes("doctor")) return "PhD";
    if (s.includes("master") || s.includes("mtech") || s.includes("m tech") || s === "ms" || s === "msc") return "Masters";
    if (s.includes("bachelor") || s.includes("btech") || s.includes("b tech") || s === "bs" || s === "bsc" || s === "ba") return "Bachelor";
    if (s.includes("diploma")) return "Diploma";
    if (s.includes("trade")) return "Trade";
    return v;
  };

  // Derive Superior/Proficient from a free-form englishScore string.
  // Accepts patterns like "IELTS S8 W8 R8 L8" or "PTE-post6Aug S88 W85 R79 L79".
  const deriveEnglishLevel = (raw: string): string => {
    if (!raw) return "";
    const s = raw.toLowerCase();
    if (/superior/.test(s)) return "Superior";
    if (/proficient/.test(s)) return "Proficient";
    const nums = Array.from(s.matchAll(/[swrl](\d{1,3})/g)).map((m) => Number(m[1]));
    if (nums.length === 4) {
      const isPte = /pte/.test(s);
      const isPostAug = /post.?6?\s*aug/.test(s) || /post-?6/.test(s);
      if (isPte) {
        if (isPostAug) {
          if (nums[0] >= 88 && nums[1] >= 85 && nums[2] >= 79 && nums[3] >= 79) return "Superior";
        } else {
          if (nums.every((n) => n >= 79)) return "Superior";
        }
        if (nums.every((n) => n >= 65)) return "Proficient";
      } else {
        // IELTS scale (1-9)
        if (nums.every((n) => n >= 8)) return "Superior";
        if (nums.every((n) => n >= 7)) return "Proficient";
      }
    }
    return "";
  };

  return {
    firstName: str("firstName"),
    age,
    visaStatus: str("visaStatus"),
    visaExpiry: str("visaExpiry"),
    educationLevel: mapEdu(str("educationLevel") || str("qualificationLevel") || str("qualification")),
    fieldOfStudy: str("fieldOfStudy"),
    universityName: str("universityName"),
    countryOfEducation: str("countryOfEducation"),
    australianStudy: str("australianStudy"),
    regionalStudy: str("regionalStudy"),
    additionalDegree: str("additionalDegree"),
    additionalDegreeField: str("additionalDegreeField"),
    additionalDegreeCountry: str("additionalDegreeCountry"),
    workingSkilled: str("workingSkilled"),
    jobTitle: str("jobTitle"),
    australianExperience: mapExp(str("australianExperience")),
    experience: mapExp(str("experience") || str("offshoreExperience")),
    jobDuties: str("jobDuties"),
    englishScore: deriveEnglishLevel(str("englishScore") || str("englishLevel")) || str("englishLevel") || str("englishScore"),
    naatiCcl: str("naatiCcl"),
    professionalYear: str("professionalYear"),
    relationshipStatus: str("relationshipStatus"),
    partnerSkills: str("partnerSkills"),
    partnerStatus: str("partnerStatus"),
  } as UserProfile;
}

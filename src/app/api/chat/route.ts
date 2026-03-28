/**
 * POST /api/chat
 *
 * Streaming AI chat endpoint for the document workspace.
 * Accepts messages array and assessmentId, validates ownership,
 * builds context-aware system prompt, streams Anthropic response,
 * and persists conversation + document updates to the database.
 */

import { z } from "zod";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/chat-prompt";
import { parseDocumentUpdates, parseACSFormUpdates, stripDocumentMarkers } from "@/lib/duty-alignment";
import type { AssessingBodyRequirement, Document as DbDocument } from "@/types/database";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  assessmentId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages, assessmentId } = parsed.data;

    // Authenticate user and verify assessment ownership
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Load assessment and verify ownership
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(
        JSON.stringify({ error: "Assessment not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Load assessing body requirements
    const matchedOccupations = assessment.matched_occupations as Record<string, unknown>;
    const primaryMatch = Array.isArray(matchedOccupations?.skillsMatches)
      ? (matchedOccupations.skillsMatches as Array<Record<string, unknown>>)[0]
      : null;

    const occupationTitle = (primaryMatch?.title as string) || "";
    const anzscoCode = (primaryMatch?.anzsco_code as string) || (primaryMatch?.anzscoCode as string) || "";
    const assessingAuthority = (primaryMatch?.assessing_authority as string) || (primaryMatch?.assessingAuthority as string) || "";

    let assessingBody: AssessingBodyRequirement | null = null;
    if (assessingAuthority) {
      const { data } = await supabase
        .from("assessing_body_requirements")
        .select("*")
        .eq("body_name", assessingAuthority)
        .single();
      assessingBody = data;
    }

    // Fallback assessing body if not found in DB
    if (!assessingBody) {
      assessingBody = {
        id: "",
        body_name: assessingAuthority || "Unknown",
        required_documents: null,
        duty_descriptors: null,
        qualification_requirements: null,
        experience_requirements: null,
        formatting_notes: null,
        conversation_template: null,
        created_at: "",
        updated_at: "",
      };
    }

    // Load existing documents for this assessment
    const { data: existingDocs } = await supabase
      .from("documents")
      .select("*")
      .eq("assessment_id", assessmentId);

    const documents: DbDocument[] = existingDocs || [];

    // Build the system prompt
    const systemPrompt = buildSystemPrompt({
      assessingBody,
      occupationTitle,
      anzscoCode,
      profileData: assessment.profile_data,
      existingDocuments: documents,
    });

    // Call Anthropic with streaming
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    // Collect the full response for post-stream processing
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              const data = JSON.stringify({ type: "text", text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Signal stream complete
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
          );
          controller.close();

          // Post-stream: save conversation and document updates
          await saveConversationAndDocuments(
            supabase,
            assessmentId,
            user.id,
            messages,
            fullResponse,
          );
        } catch (streamError) {
          console.error("Stream error:", streamError);
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Save conversation messages and upsert any document updates
 * detected in the AI response.
 */
async function saveConversationAndDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  userId: string,
  messages: Array<{ role: string; content: string }>,
  aiResponse: string,
) {
  // Build the full message history including the AI response
  const allMessages = [
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "assistant", content: stripDocumentMarkers(aiResponse) },
  ];

  // Upsert conversation record
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("assessment_id", assessmentId)
    .single();

  if (existing) {
    await supabase
      .from("conversations")
      .update({
        messages: allMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("conversations").insert({
      assessment_id: assessmentId,
      user_id: userId,
      messages: allMessages,
    });
  }

  // Parse and upsert document updates
  const docUpdates = parseDocumentUpdates(aiResponse);

  for (const update of docUpdates) {
    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(update.content);
    } catch {
      parsedContent = { raw: update.content };
    }

    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("document_type", update.documentType)
      .single();

    if (existingDoc) {
      await supabase
        .from("documents")
        .update({
          content: parsedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDoc.id);
    } else {
      await supabase.from("documents").insert({
        assessment_id: assessmentId,
        user_id: userId,
        document_type: update.documentType,
        title: update.documentType.replace(/_/g, " "),
        content: parsedContent,
      });
    }
  }

  // Parse and persist ACS form updates (stored as documents with type "acs_form_[section]")
  const acsUpdates = parseACSFormUpdates(aiResponse);

  for (const update of acsUpdates) {
    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(update.content);
    } catch {
      parsedContent = { raw: update.content };
    }

    const docType = `acs_form_${update.section}`;

    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("document_type", docType)
      .single();

    if (existingDoc) {
      await supabase
        .from("documents")
        .update({
          content: parsedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDoc.id);
    } else {
      await supabase.from("documents").insert({
        assessment_id: assessmentId,
        user_id: userId,
        document_type: docType,
        title: `ACS ${update.section.replace(/_/g, " ")}`,
        content: parsedContent,
      });
    }
  }
}

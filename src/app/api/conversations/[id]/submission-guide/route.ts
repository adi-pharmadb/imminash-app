/**
 * GET /api/conversations/[id]/submission-guide
 *   - Returns cached submission_guide_data if present.
 *
 * POST /api/conversations/[id]/submission-guide
 *   - Generates (or regenerates) the guide via Claude using real data
 *     from assessing_body_requirements + agent_knowledge + profile.
 *   - Caches the result on conversations.submission_guide_data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateSubmissionGuide,
  buildSubmissionPlaybook,
} from "@/lib/submission-guide-generator";
import {
  projectConversation,
  type ConversationRow,
  type ConversationDocument,
} from "@/lib/conversation-state";
import type {
  AgentKnowledge,
  AssessingBodyRequirement,
} from "@/types/database";

interface Match {
  title?: string;
  anzsco_code?: string;
  anzscoCode?: string;
  assessing_authority?: string;
  assessingAuthority?: string;
  confidence?: number | string;
}

function firstMatch(raw: unknown): Match | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as Match) ?? null;
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const arr =
      (Array.isArray(r.matches) && (r.matches as Match[])) ||
      (Array.isArray(r.skillsMatches) && (r.skillsMatches as Match[])) ||
      null;
    return arr?.[0] ?? null;
  }
  return null;
}

async function loadConversation(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return { data, supabase };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadConversation(id, user.id);
  if (!loaded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const row = loaded.data as ConversationRow & {
    submission_guide_data?: unknown;
  };
  const guide = row.submission_guide_data ?? null;

  // Try to build the deterministic playbook from portal_schema.
  let playbook: unknown = null;
  const topMatch = firstMatch(row.matched_occupations);
  const assessingBody =
    (topMatch?.assessing_authority as string | undefined) ??
    (topMatch?.assessingAuthority as string | undefined) ??
    null;
  if (assessingBody) {
    const { data: bodyRow } = await loaded.supabase
      .from("assessing_body_requirements")
      .select("*")
      .eq("body_name", assessingBody)
      .maybeSingle();
    const body = (bodyRow as AssessingBodyRequirement | null) ?? null;
    if (body?.portal_schema) {
      const { data: docs } = await loaded.supabase
        .from("documents")
        .select("id, document_type, title, status, content, created_at, updated_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false });
      const projection = projectConversation(
        row as unknown as ConversationRow,
        (docs ?? []) as ConversationDocument[],
      );
      playbook = buildSubmissionPlaybook(projection, body);
    }
  }

  if (!guide && !playbook) {
    return NextResponse.json({ error: "No guide generated yet" }, { status: 404 });
  }
  return NextResponse.json({ guide, playbook });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: row } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!row || row.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profile = (row.profile_data ?? {}) as Record<string, unknown>;
    const points = (row.points_breakdown ?? null) as
      | Record<string, unknown>
      | null;
    const applicantName =
      typeof profile.firstName === "string" && profile.firstName.trim().length > 0
        ? (profile.firstName as string)
        : "Applicant";

    const topMatch = firstMatch(row.matched_occupations);
    const anzscoCode =
      (topMatch?.anzsco_code as string | undefined) ??
      (topMatch?.anzscoCode as string | undefined) ??
      (row.selected_anzsco_code as string | null) ??
      "";
    const occupationTitle =
      (topMatch?.title as string | undefined) ?? "Your nominated occupation";
    const assessingBody =
      (topMatch?.assessing_authority as string | undefined) ??
      (topMatch?.assessingAuthority as string | undefined) ??
      "ACS";

    // Fetch the assessing body requirements + agent knowledge for this ANZSCO.
    let abr: AssessingBodyRequirement | null = null;
    if (assessingBody) {
      const { data: abrRow } = await supabase
        .from("assessing_body_requirements")
        .select("*")
        .eq("body_name", assessingBody)
        .maybeSingle();
      abr = (abrRow as AssessingBodyRequirement | null) ?? null;
    }

    let ak: AgentKnowledge | null = null;
    if (anzscoCode) {
      const { data: akRow } = await supabase
        .from("agent_knowledge")
        .select("*")
        .eq("anzsco_code", anzscoCode)
        .maybeSingle();
      ak = (akRow as AgentKnowledge | null) ?? null;
    }

    // How many employment references have been drafted.
    const { data: docs } = await supabase
      .from("documents")
      .select("document_type")
      .eq("conversation_id", id);

    const employmentReferencesCount = (docs ?? []).filter(
      (d) => d.document_type === "employment_reference",
    ).length;
    const cvPresent = Boolean((row as { cv_data?: unknown }).cv_data);

    const guide = await generateSubmissionGuide({
      applicantName,
      anzscoCode,
      occupationTitle,
      assessingBody,
      profile,
      points,
      cvPresent,
      employmentReferencesCount,
      assessingBodyRequirements: abr,
      agentKnowledge: ak,
    });

    await supabase
      .from("conversations")
      .update({
        submission_guide_data: guide,
        submission_guide_generated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ guide });
  } catch (err) {
    console.error("submission-guide POST failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate submission guide",
      },
      { status: 500 },
    );
  }
}

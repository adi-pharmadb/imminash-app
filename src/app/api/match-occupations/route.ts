/**
 * POST /api/match-occupations
 *
 * AI-powered occupation matching with keyword fallback.
 * Accepts user profile fields and occupation lists, returns
 * top 3 skills matches + top 2 employer matches with confidence
 * scoring, reasoning, and invitation round data.
 *
 * Graceful error handling: returns empty arrays on failure,
 * never blocks the user.
 */

import { NextResponse } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import {
  matchOccupationsRequestSchema,
  matchOccupations,
} from "@/lib/occupation-matching";
import type { EnrichedOccupation } from "@/lib/occupation-matching";
import type { AgentKnowledge } from "@/types/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = matchOccupationsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Fetch canonical occupations from the database (with enrichment columns)
    const supabase = await createClient();
    const { data: occupations, error: dbError } = await supabase
      .from("occupations")
      .select("title, anzsco_code, assessing_authority, mltssl, stsol, csol, min_189_points, qualification_level_required, unit_group_description, industry_keywords");

    if (dbError) {
      console.error("Failed to fetch occupations:", dbError);
    }

    const occupationList = occupations ?? [];
    const canonicalTitles = occupationList.map((occ) => occ.title);

    // Build a lookup map by lowercase title for enrichment
    const occByTitle = new Map(
      occupationList.map((occ) => [occ.title.toLowerCase().trim(), occ]),
    );

    // Build enriched occupation list for pre-filtering and AI prompt
    const enrichedOccupations: EnrichedOccupation[] = occupationList.map((occ) => ({
      title: occ.title,
      anzsco_code: occ.anzsco_code,
      unit_group_description: occ.unit_group_description ?? null,
      industry_keywords: occ.industry_keywords ?? null,
      qualification_level_required: occ.qualification_level_required ?? null,
      mltssl: occ.mltssl,
      stsol: occ.stsol,
      csol: occ.csol,
    }));

    // Populate occupation lists from DB if client sent empty arrays
    const input = { ...parsed.data };
    if (input.skillsOccupations.length === 0) {
      input.skillsOccupations = occupationList
        .filter((o) => o.mltssl || o.stsol)
        .map((o) => o.title);
    }
    if (input.employerOccupations.length === 0) {
      input.employerOccupations = occupationList
        .filter((o) => o.csol)
        .map((o) => o.title);
    }

    // Fetch agent knowledge entries
    const { data: agentKnowledgeData } = await supabase
      .from("agent_knowledge")
      .select("*");

    const agentKnowledge: AgentKnowledge[] = (agentKnowledgeData ?? []) as AgentKnowledge[];

    const result = await matchOccupations(
      input,
      canonicalTitles,
      enrichedOccupations,
      agentKnowledge,
      anthropic,
      AI_MODEL,
    );

    // Fetch invitation round data for matched ANZSCO codes
    const matchedCodes = [
      ...result.skillsMatches.map((m) => {
        const occ = occByTitle.get(m.title.toLowerCase().trim());
        return occ?.anzsco_code;
      }),
      ...result.employerMatches.map((m) => {
        const occ = occByTitle.get(m.title.toLowerCase().trim());
        return occ?.anzsco_code;
      }),
    ].filter(Boolean) as string[];

    const invitationMap = new Map<string, { round_date: string | null; minimum_points: number | null; invitations_issued: number | null }>();

    if (matchedCodes.length > 0) {
      const { data: invitations } = await supabase
        .from("invitation_rounds")
        .select("anzsco_code, round_date, minimum_points, invitations_issued")
        .in("anzsco_code", matchedCodes)
        .order("round_date", { ascending: false });

      if (invitations) {
        for (const inv of invitations) {
          // Only keep the most recent per ANZSCO code
          if (inv.anzsco_code && !invitationMap.has(inv.anzsco_code)) {
            invitationMap.set(inv.anzsco_code, {
              round_date: inv.round_date,
              minimum_points: inv.minimum_points,
              invitations_issued: inv.invitations_issued,
            });
          }
        }
      }
    }

    // Enrich matches with DB metadata
    const enrichMatch = (m: {
      title: string;
      confidence: number;
      reasoning: string;
      experience_aligned: boolean;
      warnings: string[];
      score: number;
    }) => {
      const occ = occByTitle.get(m.title.toLowerCase().trim());
      const list = occ?.mltssl ? "MLTSSL" : occ?.stsol ? "STSOL" : occ?.csol ? "CSOL" : null;
      const anzscoCode = occ?.anzsco_code ?? "";
      return {
        title: m.title,
        anzsco_code: anzscoCode,
        confidence: m.confidence,
        reasoning: m.reasoning,
        experience_aligned: m.experience_aligned,
        warnings: m.warnings,
        score: m.score,
        assessing_authority: occ?.assessing_authority ?? null,
        list,
        min_189_points: occ?.min_189_points ?? null,
        latest_invitation: invitationMap.get(anzscoCode) ?? null,
      };
    };

    return NextResponse.json({
      skillsMatches: result.skillsMatches.map(enrichMatch),
      employerMatches: result.employerMatches.map(enrichMatch),
    });
  } catch (error) {
    console.error("match-occupations route error:", error);
    return NextResponse.json(
      { skillsMatches: [], employerMatches: [] },
      { status: 200 },
    );
  }
}

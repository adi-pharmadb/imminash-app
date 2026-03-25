/**
 * GET /api/admin/knowledge
 *
 * List all agent knowledge entries joined with occupation titles.
 * Protected by Supabase auth + admin role check.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch all occupations with their knowledge entries
    const { data: occupations, error: occError } = await supabase
      .from("occupations")
      .select("anzsco_code, title")
      .order("title");

    if (occError) {
      console.error("Failed to fetch occupations:", occError);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const { data: knowledge, error: knError } = await supabase
      .from("agent_knowledge")
      .select("*");

    if (knError) {
      console.error("Failed to fetch knowledge:", knError);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Build a map of knowledge entries by ANZSCO code
    const knowledgeMap = new Map(
      (knowledge ?? []).map((k: any) => [k.anzsco_code, k]),
    );

    const result = (occupations ?? []).map((occ: any) => ({
      anzsco_code: occ.anzsco_code,
      title: occ.title,
      has_knowledge: knowledgeMap.has(occ.anzsco_code),
      knowledge: knowledgeMap.get(occ.anzsco_code) ?? null,
    }));

    return NextResponse.json({ occupations: result });
  } catch (error) {
    console.error("Admin knowledge list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

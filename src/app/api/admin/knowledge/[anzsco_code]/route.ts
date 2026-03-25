/**
 * PUT /api/admin/knowledge/[anzsco_code]
 *
 * Upsert agent knowledge entry for a specific occupation.
 * Protected by Supabase auth + admin role check.
 * Uses service role client for writes (RLS write is restricted).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/auth-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ anzsco_code: string }> },
) {
  try {
    const { anzsco_code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { strategic_advice, common_pitfalls, recommended_approach, tips_and_hacks, custom_notes } = body;

    // Use service role client to bypass RLS for writes
    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("agent_knowledge")
      .upsert(
        {
          anzsco_code,
          strategic_advice: strategic_advice ?? null,
          common_pitfalls: common_pitfalls ?? null,
          recommended_approach: recommended_approach ?? null,
          tips_and_hacks: tips_and_hacks ?? null,
          custom_notes: custom_notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "anzsco_code" },
      )
      .select()
      .single();

    if (error) {
      console.error("Failed to upsert knowledge:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ knowledge: data });
  } catch (error) {
    console.error("Admin knowledge upsert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

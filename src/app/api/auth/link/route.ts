import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkAssessmentToUser, ensureProfile } from "@/lib/auth-helpers";

/**
 * POST /api/auth/link
 * Links an assessment to a newly authenticated user.
 * Called from the client-side auth callback page.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the user is actually authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email } = body;

    // Extra safety: ensure the userId matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureProfile(userId, email || user.email || "");
    await linkAssessmentToUser(userId, email || user.email || "");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth link error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

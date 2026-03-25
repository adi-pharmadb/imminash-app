import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { linkAssessmentToUser, ensureProfile } from "@/lib/auth-helpers";

/**
 * POST /api/auth/link
 * Links an assessment to a newly authenticated user.
 * Called from the client-side auth callback page.
 *
 * Uses the service role client to verify the user exists in Supabase auth,
 * because the session cookie may not be set yet when this is called
 * immediately after magic link verification (session is in hash fragment).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    // Verify the user actually exists in Supabase auth using service role
    const supabase = createServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    await ensureProfile(userId, email || user.email || "");
    await linkAssessmentToUser(userId, email || user.email || "");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth link error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

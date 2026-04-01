import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/check-payment
 *
 * Checks if the authenticated user has a completed payment.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ paid: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("user_id", session.user.id)
      .eq("status", "paid")
      .limit(1)
      .single();

    return NextResponse.json({ paid: !!payment });
  } catch {
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}

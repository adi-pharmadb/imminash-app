/**
 * POST /api/reassessment-trigger
 *
 * Captures a re-assessment trigger (visa expiry, studies completion, promotion)
 * with the user's email and approximate date. Stores in DB for future
 * email automation (deferred). CTO Brief v2 section 3.4
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().email(),
  assessmentId: z.string().optional(),
  triggerType: z.enum(["visa_expiry", "studies_completion", "promotion"]),
  triggerDate: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { email, assessmentId, triggerType, triggerDate } = parsed.data;

    const supabase = await createClient();

    // Store the trigger - uses a simple insert into a reassessment_triggers table
    // If the table doesn't exist yet, this will fail silently (non-critical feature)
    try {
      await supabase.from("reassessment_triggers").insert({
        email,
        assessment_id: assessmentId || null,
        trigger_type: triggerType,
        trigger_date: triggerDate,
      });
    } catch {
      // Table may not exist yet - log and continue
      console.warn("reassessment_triggers table may not exist yet");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("reassessment-trigger error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Check if a user ID is in the admin allowlist.
 * Admin user IDs are stored as a comma-separated list in the
 * ADMIN_USER_IDS environment variable.
 */
export function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS ?? "";
  const allowlist = adminIds.split(",").map((id) => id.trim()).filter(Boolean);
  return allowlist.includes(userId);
}

/**
 * Link anonymous assessment records to a newly authenticated user.
 * Finds assessments with a matching lead_id (via the user's email)
 * and sets the user_id. Uses service role to bypass RLS. [AC-AU2]
 */
export async function linkAssessmentToUser(
  userId: string,
  email: string,
): Promise<void> {
  const supabase = createServiceClient();

  // Find the lead record matching this email
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lead) return;

  // Update all assessments linked to this lead that have no user_id
  await supabase
    .from("assessments")
    .update({ user_id: userId })
    .eq("lead_id", lead.id)
    .is("user_id", null);
}

/**
 * Ensure a profile row exists for the authenticated user.
 * Uses service role to bypass RLS. [AC-AU3]
 */
export async function ensureProfile(
  userId: string,
  email: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (existing) {
    await supabase
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", userId);
    return;
  }

  // Try to get first_name from the lead record
  let firstName: string | null = null;
  if (email) {
    const { data: lead } = await supabase
      .from("leads")
      .select("first_name")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lead) {
      firstName = lead.first_name;
    }
  }

  await supabase.from("profiles").insert({
    id: userId,
    email,
    first_name: firstName,
  });
}

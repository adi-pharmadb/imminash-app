import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth-helpers";

/**
 * GET /auth/callback
 *
 * Exchanges the PKCE code for a session, ensures a profile row exists,
 * ensures the user has an active conversation (creating an empty phase1
 * row if not), and redirects into /chat.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      try {
        const userId = data.session.user.id;
        const email = data.session.user.email ?? "";
        await ensureProfile(userId, email);

        // Ensure a conversation exists for this user.
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await supabase.from("conversations").insert({
            user_id: userId,
            status: "phase1",
            profile_data: {},
            messages: [],
          });
        }
      } catch (err) {
        console.error("auth callback setup failed:", err);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

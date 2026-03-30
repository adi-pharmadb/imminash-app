import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { linkAssessmentToUser, ensureProfile } from "@/lib/auth-helpers";

/**
 * GET /auth/callback
 *
 * Server-side route handler for Supabase PKCE auth flow.
 * Exchanges the `code` query parameter for a session,
 * links the assessment to the user, then redirects to /value.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/value";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Link assessment to user server-side
      try {
        const userId = data.session.user.id;
        const email = data.session.user.email ?? "";
        const serviceClient = createServiceClient();
        const { data: { user } } = await serviceClient.auth.admin.getUserById(userId);

        if (user) {
          await ensureProfile(userId, email || user.email || "");
          await linkAssessmentToUser(userId, email || user.email || "");
        }
      } catch (linkError) {
        console.error("Failed to link assessment during callback:", linkError);
        // Non-fatal - continue to redirect even if linking fails
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed - redirect back to results
  return NextResponse.redirect(`${origin}/results`);
}

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js middleware that:
 * 1. Refreshes the Supabase auth session on every request
 * 2. Protects /workspace/* routes by redirecting unauthenticated users to /results
 */
export async function middleware(request: NextRequest) {
  // Refresh the Supabase session (sets updated cookies)
  const response = await updateSession(request);

  // Protect /workspace routes
  if (request.nextUrl.pathname.startsWith("/workspace")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only check; cookie setting handled by updateSession
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL("/results", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

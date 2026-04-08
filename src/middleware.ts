import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware:
 * 1. Refreshes the Supabase session on every request.
 * 2. Redirects legacy routes (/assessment, /results, /pathway, /workspace)
 *    to /chat for authed users or / for unauthed users.
 * 3. Gates /chat behind auth.
 */
const LEGACY_PREFIXES = ["/assessment", "/results", "/pathway", "/workspace", "/value"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isLegacy = LEGACY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");

  if (!isLegacy && !isChat) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isLegacy) {
    const dest = user ? "/chat" : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isChat && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

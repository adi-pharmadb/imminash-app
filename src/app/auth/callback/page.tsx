"use client";

/**
 * Client-side auth callback page.
 * Handles the hash fragment from Supabase magic link verification,
 * then links the assessment to the user and redirects to /workspace.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying your login...");

  useEffect(() => {
    async function handleAuth() {
      const supabase = createClient();

      // The Supabase client automatically picks up the hash fragment
      // (#access_token=...) and establishes the session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Try listening for auth state change (session may not be ready yet)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (event === "SIGNED_IN" && newSession) {
              subscription.unsubscribe();
              await linkAndRedirect(newSession.user.id, newSession.user.email ?? "");
            }
          }
        );

        // Give it a few seconds, then redirect on failure
        setTimeout(() => {
          subscription.unsubscribe();
          setStatus("Login failed. Redirecting...");
          router.push("/results");
        }, 5000);
        return;
      }

      await linkAndRedirect(session.user.id, session.user.email ?? "");
    }

    async function linkAndRedirect(userId: string, email: string) {
      try {
        // Call a server-side endpoint to link assessment using service role
        await fetch("/api/auth/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, email }),
        });
      } catch {
        // Non-blocking - continue to workspace even if linking fails
      }
      router.push("/workspace");
    }

    handleAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  projectConversation,
  type ConversationRow,
  type ConversationDocument,
} from "@/lib/conversation-state";
import { ChatLayout } from "@/components/chat/ChatLayout";

/**
 * /chat — server component.
 * Loads (or creates) the user's most recent conversation and renders
 * the three-panel ChatLayout client component.
 */
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  // Run the three independent awaits in parallel instead of sequentially.
  const [sp, supabase] = await Promise.all([searchParams, createClient()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: row0 } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let row = row0;
  if (!row) {
    const { data: inserted } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        status: "phase1",
        profile_data: {},
        messages: [],
      })
      .select("*")
      .single();
    row = inserted;
  }

  if (!row) redirect("/");

  const { data: docs } = await supabase
    .from("documents")
    .select("id, document_type, title, status, content, created_at, updated_at")
    .eq("conversation_id", row.id)
    .order("created_at", { ascending: false });

  const projection = projectConversation(
    row as unknown as ConversationRow,
    (docs ?? []) as ConversationDocument[],
  );

  return <ChatLayout initialProjection={projection} paidFlag={sp.paid === "1"} />;
}

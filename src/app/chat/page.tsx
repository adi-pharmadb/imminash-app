import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectConversation, type ConversationRow } from "@/lib/conversation-state";
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
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  let { data: row } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const projection = projectConversation(row as unknown as ConversationRow);

  return <ChatLayout initialProjection={projection} paidFlag={sp.paid === "1"} />;
}

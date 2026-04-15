import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  projectConversation,
  type ConversationDocument,
  type ConversationRow,
} from "@/lib/conversation-state";
import { SubmissionGuide } from "@/components/premium/SubmissionGuide";

/**
 * /chat/submission-guide/[id]
 *
 * Premium printable deliverable showing applicant snapshot, document
 * manifest, step-by-step submission timeline, risk callouts, and download
 * CTAs. Only available to the conversation owner.
 */
export default async function SubmissionGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: row } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.user_id !== user.id) notFound();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, document_type, title, status, content, created_at, updated_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false });

  const projection = projectConversation(
    row as unknown as ConversationRow,
    (docs ?? []) as ConversationDocument[],
  );

  return <SubmissionGuide projection={projection} />;
}

/**
 * GET /api/documents/conversation/[conversationId]/[documentId]?format=pdf|docx
 *
 * Conversation-keyed single-document download for the chat-first flow.
 * Mirrors the legacy assessment-keyed endpoint but uses RLS via
 * conversations.user_id (chat-first conversations have assessment_id = null).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/pdf-generator";
import { generateDocx } from "@/lib/docx-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; documentId: string }> },
) {
  try {
    const { conversationId, documentId } = await params;
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "pdf").toLowerCase();
    if (format !== "pdf" && format !== "docx") {
      return NextResponse.json(
        { error: "Invalid format. Use pdf or docx." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify conversation ownership.
    const { data: convo } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!convo || convo.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Load document scoped to that conversation.
    const { data: doc } = await supabase
      .from("documents")
      .select("id, document_type, title, content, conversation_id")
      .eq("id", documentId)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const content = (doc.content as Record<string, unknown>) || {};
    const docTitle = (doc.title as string) || doc.document_type;

    let fileBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (format === "pdf") {
      fileBuffer = await generatePdf(doc.document_type, docTitle, content);
      contentType = "application/pdf";
      extension = "pdf";
    } else {
      fileBuffer = await generateDocx(doc.document_type, docTitle, content);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extension = "docx";
    }

    const safeName = docTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}.${extension}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("conversation document download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

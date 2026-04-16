/**
 * GET /api/documents/conversation/[conversationId]/download-all
 *
 * Bundle all documents in a chat-first conversation (PDF + DOCX) plus a
 * cover sheet PDF into a single ZIP. Conversation-keyed parallel of the
 * legacy assessment-based endpoint.
 */

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/pdf-generator";
import { generateDocx } from "@/lib/docx-generator";
import { generateCoverSheetPdf } from "@/lib/cover-sheet-generator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: convo } = await supabase
      .from("conversations")
      .select("id, user_id, profile_data, matched_occupations, selected_anzsco_code")
      .eq("id", conversationId)
      .maybeSingle();

    if (!convo || convo.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: docs } = await supabase
      .from("documents")
      .select("id, document_type, title, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No documents to bundle yet" },
        { status: 404 },
      );
    }

    const profile = (convo.profile_data ?? {}) as Record<string, unknown>;
    const applicantName =
      typeof profile.firstName === "string" && profile.firstName.trim().length > 0
        ? (profile.firstName as string)
        : "Applicant";

    // Resolve occupation metadata from matched_occupations.
    const matchesRaw = convo.matched_occupations;
    let matches: Array<Record<string, unknown>> = [];
    if (Array.isArray(matchesRaw)) {
      matches = matchesRaw as Array<Record<string, unknown>>;
    } else if (
      matchesRaw &&
      typeof matchesRaw === "object" &&
      Array.isArray((matchesRaw as { matches?: unknown }).matches)
    ) {
      matches = (matchesRaw as { matches: Array<Record<string, unknown>> }).matches;
    }
    const selectedCode = (convo.selected_anzsco_code as string | null) ?? "";
    const primary =
      matches.find(
        (m) =>
          selectedCode &&
          (m.anzsco_code === selectedCode || m.anzscoCode === selectedCode),
      ) ??
      matches[0] ??
      {};
    const occupationTitle =
      typeof primary.title === "string" ? (primary.title as string) : "";
    const anzscoCode =
      (typeof primary.anzsco_code === "string" ? (primary.anzsco_code as string) : "") ||
      (typeof primary.anzscoCode === "string" ? (primary.anzscoCode as string) : "") ||
      selectedCode;
    const assessingBody =
      (typeof primary.assessing_authority === "string"
        ? (primary.assessing_authority as string)
        : "") ||
      (typeof primary.assessingAuthority === "string"
        ? (primary.assessingAuthority as string)
        : "") ||
      "ACS";

    const zip = new JSZip();

    // Cover sheet
    try {
      const coverBuf = await generateCoverSheetPdf({
        applicantName,
        occupationTitle,
        anzscoCode,
        assessingBody,
        dateGenerated: new Date().toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        documents: docs.map((d) => ({
          name: (d.title as string) || d.document_type,
          type: d.document_type,
        })),
      });
      zip.file("00 — Cover Sheet.pdf", coverBuf);
    } catch (err) {
      console.error("cover sheet generation failed:", err);
    }

    // Each document as PDF + DOCX
    for (const [idx, doc] of docs.entries()) {
      const title = (doc.title as string) || doc.document_type;
      const content = (doc.content as Record<string, unknown>) || {};
      const safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || doc.document_type;
      const prefix = String(idx + 1).padStart(2, "0");

      try {
        const pdfBuf = await generatePdf(doc.document_type, title, content);
        zip.file(`${prefix} — ${safeName}.pdf`, pdfBuf);
      } catch (err) {
        console.error(`pdf gen failed for ${doc.id}:`, err);
      }

      try {
        const docxBuf = await generateDocx(doc.document_type, title, content);
        zip.file(`${prefix} — ${safeName}.docx`, docxBuf);
      } catch (err) {
        console.error(`docx gen failed for ${doc.id}:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    // RFC 5987: ASCII-safe filename fallback + utf-8 filename* for modern browsers.
    const asciiSafe = `Application Pack - ${applicantName.replace(/[^A-Za-z0-9 _-]/g, "")}.zip`;
    const utf8Full = encodeURIComponent(`Application Pack — ${applicantName}.zip`);

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Full}`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("download-all (conversation) error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

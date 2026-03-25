/**
 * POST /api/documents/download/[documentId]
 *
 * Generate a PDF or DOCX for a single document.
 * Saves the generated file to Supabase Storage and updates
 * the document's storage_path. [AC-DD1, AC-DD2, AC-DD4]
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/pdf-generator";
import { generateDocx } from "@/lib/docx-generator";

const requestSchema = z.object({
  format: z.enum(["pdf", "docx"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Provide format: 'pdf' or 'docx'." },
        { status: 400 },
      );
    }

    const { format } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Load the document and verify ownership through the assessment
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*, assessments!inner(user_id)")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const assessmentRow = doc.assessments as unknown as { user_id: string | null };
    if (assessmentRow.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    // Generate the file
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

    // Save to Supabase Storage [AC-DD4]
    const fileName = `${doc.document_type}-${doc.id}.${extension}`;
    const storagePath = `documents/${user.id}/${doc.assessment_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue with download even if storage fails
    } else {
      // Update storage_path in the documents table [AC-DD4]
      await supabase
        .from("documents")
        .update({ storage_path: storagePath })
        .eq("id", documentId);
    }

    // Return file as download response
    const safeName = docTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}.${extension}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

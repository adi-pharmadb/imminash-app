/**
 * POST /api/documents/[assessmentId]/download-all
 *
 * Generate PDF + DOCX for all documents in an assessment and bundle
 * them into a ZIP file. Saves individual files to Supabase Storage. [AC-DD3]
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/pdf-generator";
import { generateDocx } from "@/lib/docx-generator";
import type { Document as DbDocument } from "@/types/database";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;

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

    // Verify ownership
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found or access denied" },
        { status: 404 },
      );
    }

    // Load all documents
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("assessment_id", assessmentId);

    if (docError || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: "No documents found for this assessment" },
        { status: 404 },
      );
    }

    const zip = new JSZip();

    // Generate PDF and DOCX for each document and add to ZIP
    for (const doc of documents as DbDocument[]) {
      const content = (doc.content as Record<string, unknown>) || {};
      const docTitle = doc.title || doc.document_type;
      const safeName = docTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

      // PDF
      const pdfBuffer = await generatePdf(doc.document_type, docTitle, content);
      zip.file(`${safeName}.pdf`, pdfBuffer);

      // DOCX
      const docxBuffer = await generateDocx(doc.document_type, docTitle, content);
      zip.file(`${safeName}.docx`, docxBuffer);

      // Save to Supabase Storage
      const pdfPath = `documents/${user.id}/${assessmentId}/${doc.document_type}-${doc.id}.pdf`;
      const docxPath = `documents/${user.id}/${assessmentId}/${doc.document_type}-${doc.id}.docx`;

      const [pdfUpload, docxUpload] = await Promise.all([
        supabase.storage
          .from("documents")
          .upload(pdfPath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          }),
        supabase.storage
          .from("documents")
          .upload(docxPath, docxBuffer, {
            contentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: true,
          }),
      ]);

      // Update storage_path with the PDF path (primary format)
      if (!pdfUpload.error) {
        await supabase
          .from("documents")
          .update({ storage_path: pdfPath })
          .eq("id", doc.id);
      }

      if (docxUpload.error) {
        console.error(`DOCX upload error for ${doc.document_type}:`, docxUpload.error);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="documents-${assessmentId.slice(0, 8)}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Download-all error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

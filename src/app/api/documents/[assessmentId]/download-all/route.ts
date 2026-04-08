/**
 * POST /api/documents/[assessmentId]/download-all
 *
 * Generate PDF + DOCX for all documents in an assessment, plus a
 * Package Cover Sheet PDF, and bundle them into a ZIP file.
 * Saves individual files to Supabase Storage. [AC-DD3]
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/pdf-generator";
import { generateDocx } from "@/lib/docx-generator";
import { generateCoverSheetPdf } from "@/lib/cover-sheet-generator";
import type { Document as DbDocument, Assessment } from "@/types/database";

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

    // Verify ownership and load assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found or access denied" },
        { status: 404 },
      );
    }

    const typedAssessment = assessment as Assessment;

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

    // Check all non-form documents are approved before allowing download
    const contentDocs = (documents as DbDocument[]).filter(
      (d) => !d.document_type.startsWith("acs_form_"),
    );
    const unapproved = contentDocs.filter((d) => d.status !== "approved");
    if (unapproved.length > 0) {
      return NextResponse.json(
        {
          error: "All documents must be approved before downloading",
          unapproved: unapproved.map((d) => d.document_type),
        },
        { status: 400 },
      );
    }

    const zip = new JSZip();

    // Collect document names for the cover sheet
    const documentManifest: Array<{ name: string; type: string }> = [];

    // Generate PDF and DOCX for each document and add to ZIP
    for (const doc of documents as DbDocument[]) {
      const content = (doc.content as Record<string, unknown>) || {};
      const docTitle = doc.title || doc.document_type;
      const safeName = docTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

      // Skip ACS form sections (internal data, not downloadable documents)
      if (doc.document_type.startsWith("acs_form_")) continue;

      // Manager briefing emails: save as plain text, not PDF/DOCX
      if (doc.document_type.startsWith("manager_briefing_email")) {
        const rawText = (content.raw as string) || JSON.stringify(content, null, 2);
        zip.file(`${safeName}.txt`, rawText);
        documentManifest.push({ name: docTitle.replace(/_/g, " "), type: doc.document_type });
        continue;
      }

      // PDF
      const pdfBuffer = await generatePdf(doc.document_type, docTitle, content);
      zip.file(`${safeName}.pdf`, pdfBuffer);

      // DOCX
      const docxBuffer = await generateDocx(doc.document_type, docTitle, content);
      zip.file(`${safeName}.docx`, docxBuffer);

      documentManifest.push({
        name: docTitle.replace(/_/g, " "),
        type: doc.document_type,
      });

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

    // Extract applicant info from the assessment profile data
    const profileData = typedAssessment.profile_data || {};
    const firstName = (profileData.firstName as string) || "Applicant";
    const lastName = (profileData.lastName as string) || "";

    // Extract occupation info from matched_occupations
    const matchedOccupations = typedAssessment.matched_occupations || {};
    const skillsMatches = Array.isArray(
      (matchedOccupations as Record<string, unknown>).skillsMatches,
    )
      ? ((matchedOccupations as Record<string, unknown>).skillsMatches as Array<Record<string, unknown>>)
      : [];
    // Use selected_anzsco_code (DB source of truth), fallback to first match
    let primaryMatch: Record<string, unknown> = skillsMatches[0] || {};
    const selectedAnzsco = (typedAssessment as unknown as Record<string, unknown>).selected_anzsco_code as string | null;
    if (selectedAnzsco) {
      const selected = skillsMatches.find(
        (m) => (m.anzsco_code as string) === selectedAnzsco,
      );
      if (selected) primaryMatch = selected;
    }

    const occupationTitle = (primaryMatch.title as string) || "Not specified";
    const anzscoCode = selectedAnzsco || (primaryMatch.anzsco_code as string) || (primaryMatch.anzscoCode as string) || "";
    const assessingBody = (primaryMatch.assessing_authority as string) || (primaryMatch.assessingAuthority as string) || "";

    // Generate Package Cover Sheet PDF
    const coverSheetBuffer = await generateCoverSheetPdf({
      applicantName: `${firstName} ${lastName}`.trim(),
      occupationTitle,
      anzscoCode,
      assessingBody,
      dateGenerated: new Date().toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      documents: documentManifest,
    });

    const coverSheetFileName = `Package_Summary_${firstName}_${lastName}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    zip.file(`${coverSheetFileName}.pdf`, coverSheetBuffer);

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

/**
 * GET /api/documents/[assessmentId]
 *
 * Retrieve all documents for an assessment.
 * Validates that the authenticated user owns the assessment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // Verify the user owns this assessment
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

    // Retrieve all documents for this assessment
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("id, assessment_id, user_id, document_type, title, content, storage_path, created_at, updated_at")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true });

    if (docError) {
      return NextResponse.json(
        { error: "Failed to retrieve documents" },
        { status: 500 },
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

"use client";

/**
 * Workspace page: loads assessment data and existing conversation for
 * the authenticated user, then renders the split-panel workspace layout.
 *
 * For ACS assessments: loads persisted ACS form data from documents.
 * Redirects to /results if not authenticated or no assessment found.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import {
  generateFirstMessage,
  getDocumentTabs,
  isACSBody,
  type WorkspaceAssessmentData,
  type ChatMessage,
} from "@/lib/workspace-helpers";
import type {
  Assessment,
  AssessingBodyRequirement,
  Document as DbDocument,
  Conversation,
} from "@/types/database";
import type { ACSApplicationData } from "@/types/acs-application";
import { createEmptyACSApplication } from "@/types/acs-application";

type LoadingState = "loading" | "ready" | "error";

/**
 * Reconstruct ACS application data from persisted documents
 * (stored with document_type = "acs_form_[section]").
 */
function loadACSDataFromDocuments(docs: DbDocument[]): ACSApplicationData {
  const data = createEmptyACSApplication();

  for (const doc of docs) {
    if (!doc.document_type.startsWith("acs_form_") || !doc.content) continue;

    const section = doc.document_type.replace("acs_form_", "");
    const content = doc.content as Record<string, unknown>;

    switch (section) {
      case "personal_details":
        data.personalDetails = { ...data.personalDetails, ...content };
        break;
      case "anzsco_code":
        data.anzscoCode = { ...data.anzscoCode, ...content };
        break;
      case "upload_history":
        if (Array.isArray(content.items)) {
          data.uploadHistory = { items: content.items as ACSApplicationData["uploadHistory"]["items"] };
        }
        break;
      case "qualifications":
        if (Array.isArray(content.entries)) {
          data.qualifications = { entries: content.entries as ACSApplicationData["qualifications"]["entries"] };
        }
        break;
      case "employment":
        if (Array.isArray(content.entries)) {
          data.employment = { entries: content.entries as ACSApplicationData["employment"]["entries"] };
        }
        break;
      case "summary":
        data.summary = { ...data.summary, ...content };
        break;
    }
  }

  return data;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [assessmentData, setAssessmentData] = useState<WorkspaceAssessmentData | null>(null);
  const [assessingBody, setAssessingBody] = useState<AssessingBodyRequirement | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [initialDocuments, setInitialDocuments] = useState<DbDocument[]>([]);
  const [documentTabs, setDocumentTabs] = useState<string[]>([]);
  const [initialACSData, setInitialACSData] = useState<ACSApplicationData | undefined>();

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const supabase = createClient();

        // Check authentication
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/results");
          return;
        }

        const userId = sessionData.session.user.id;

        // Check if user has paid
        const { data: payment } = await supabase
          .from("payments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "paid")
          .limit(1)
          .single();

        if (!payment) {
          router.push("/value");
          return;
        }

        // Load the most recent assessment for this user
        const { data: assessment, error: assessmentError } = await supabase
          .from("assessments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (assessmentError || !assessment) {
          // No assessment found for this user — send them to start the assessment
          // (not /results, which would redirect back here and create a loop)
          router.push("/assessment");
          return;
        }

        const typedAssessment = assessment as Assessment;

        // Extract occupation info from matched_occupations
        const matchedOccupations = typedAssessment.matched_occupations || {};
        const skillsMatches = Array.isArray(
          (matchedOccupations as Record<string, unknown>).skillsMatches,
        )
          ? ((matchedOccupations as Record<string, unknown>).skillsMatches as Array<Record<string, unknown>>)
          : [];

        // Check if user selected a specific occupation (stored in sessionStorage)
        let selectedAnzsco: string | null = null;
        try {
          selectedAnzsco = sessionStorage.getItem("imminash_selected_occupation");
        } catch { /* ignore */ }

        // Find the selected occupation, or fall back to the first match
        let primaryMatch: Record<string, unknown> = skillsMatches[0] || {};
        if (selectedAnzsco) {
          const selected = skillsMatches.find(
            (m) => (m.anzsco_code as string) === selectedAnzsco,
          );
          if (selected) primaryMatch = selected;
        }

        // DB stores snake_case keys (anzsco_code, assessing_authority)
        const occupationTitle = (primaryMatch.title as string) || "";
        const anzscoCode = (primaryMatch.anzsco_code as string) || (primaryMatch.anzscoCode as string) || "";
        const assessingAuthority = (primaryMatch.assessing_authority as string) || (primaryMatch.assessingAuthority as string) || "";

        // Load assessing body requirements
        let body: AssessingBodyRequirement | null = null;
        if (assessingAuthority) {
          const { data: bodyData } = await supabase
            .from("assessing_body_requirements")
            .select("*")
            .eq("body_name", assessingAuthority)
            .single();
          body = bodyData as AssessingBodyRequirement | null;
        }

        // Compute match level from confidence score
        const confidence = (primaryMatch.confidence as number) || 0;
        const matchLevel = confidence >= 75 ? "Strong" : confidence >= 50 ? "Medium" : "Weak";

        const workspaceData: WorkspaceAssessmentData = {
          assessmentId: typedAssessment.id,
          occupationTitle,
          anzscoCode,
          assessingAuthority,
          profileData: typedAssessment.profile_data,
          totalPoints: typedAssessment.total_points,
          matchLevel,
        };

        // Load existing conversation [AC-DW7]
        const { data: conversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("assessment_id", typedAssessment.id)
          .single();

        let messages: ChatMessage[] = [];

        if (conversation) {
          const typedConv = conversation as Conversation;
          messages = (typedConv.messages || []).map((m) => ({
            role: (m.role as string) === "user" ? "user" : "assistant",
            content: (m.content as string) || "",
          })) as ChatMessage[];
        }

        // If no existing conversation, generate the first AI message [AC-DW1, AC-DW8]
        if (messages.length === 0) {
          const firstMessage = generateFirstMessage(workspaceData, body);
          messages = [{ role: "assistant", content: firstMessage }];
        }

        // Load existing documents
        const { data: docs } = await supabase
          .from("documents")
          .select("*")
          .eq("assessment_id", typedAssessment.id);

        const existingDocs = (docs as DbDocument[]) || [];

        // Determine document tabs from assessing body
        const tabs = getDocumentTabs(body);

        // For ACS bodies, reconstruct ACS form data from persisted documents
        if (isACSBody(assessingAuthority)) {
          const acsData = loadACSDataFromDocuments(existingDocs);

          // Pre-fill ANZSCO code from the assessment match
          if (!acsData.anzscoCode.code) {
            acsData.anzscoCode.code = anzscoCode;
            acsData.anzscoCode.title = occupationTitle;
          }

          // Pre-fill name from profile data
          if (!acsData.personalDetails.firstName && typedAssessment.profile_data.firstName) {
            acsData.personalDetails.firstName = typedAssessment.profile_data.firstName as string;
          }

          setInitialACSData(acsData);
        }

        setAssessmentData(workspaceData);
        setAssessingBody(body);
        setInitialMessages(messages);
        setInitialDocuments(existingDocs);
        setDocumentTabs(tabs);
        setLoadingState("ready");
      } catch (error) {
        console.error("Failed to load workspace data:", error);
        setLoadingState("error");
      }
    }

    loadWorkspaceData();
  }, [router]);

  if (loadingState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (loadingState === "error" || !assessmentData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-2 text-center">
          <p className="text-foreground font-medium">Failed to load workspace</p>
          <p className="text-sm text-muted-foreground">
            Please try again or return to your results.
          </p>
          <button
            onClick={() => router.push("/results")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      initialMessages={initialMessages}
      initialDocuments={initialDocuments}
      assessmentId={assessmentData.assessmentId}
      documentTabs={documentTabs}
      assessingBody={assessingBody}
      assessingAuthority={assessmentData.assessingAuthority}
      occupationTitle={assessmentData.occupationTitle}
      anzscoCode={assessmentData.anzscoCode}
      initialACSData={initialACSData}
    />
  );
}

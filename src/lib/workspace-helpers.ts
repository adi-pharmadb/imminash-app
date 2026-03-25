/**
 * Workspace helper utilities for generating body-specific first messages,
 * extracting document tab labels, and managing workspace state.
 */

import type { AssessingBodyRequirement } from "@/types/database";

export interface WorkspaceAssessmentData {
  assessmentId: string;
  occupationTitle: string;
  anzscoCode: string;
  assessingAuthority: string;
  profileData: Record<string, unknown>;
  totalPoints: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Check if the assessing authority is ACS.
 */
export function isACSBody(authority: string): boolean {
  const normalized = authority.toUpperCase().trim();
  return normalized === "ACS" || normalized.includes("AUSTRALIAN COMPUTER SOCIETY");
}

/**
 * Generate the initial AI greeting message based on the assessing body.
 * Each body produces a different opening that references the user's
 * matched occupation and asks body-specific questions. [AC-DW1, AC-DW8]
 */
export function generateFirstMessage(
  data: WorkspaceAssessmentData,
  assessingBody: AssessingBodyRequirement | null,
): string {
  const { occupationTitle, anzscoCode, assessingAuthority, profileData } = data;
  const firstName = (profileData.firstName as string) || "there";
  const bodyName = assessingBody?.body_name || assessingAuthority || "your assessing body";

  const normalizedBody = bodyName.toUpperCase().trim();

  if (normalizedBody === "ACS" || normalizedBody.includes("AUSTRALIAN COMPUTER SOCIETY")) {
    return (
      `Hi ${firstName}! Welcome to your ACS skill assessment preparation.\n\n` +
      `I'll be guiding you through the **Australian Computer Society** application for ` +
      `**${occupationTitle}** (ANZSCO ${anzscoCode}). On the right, you can see the ACS application form ` +
      `that mirrors the real portal. As we chat, I'll fill in each section for you.\n\n` +
      `Let's start with your **Personal Details**. Can you confirm:\n\n` +
      `1. Your full name (as it appears on your passport)\n` +
      `2. Date of birth\n` +
      `3. Country of citizenship\n` +
      `4. Contact email and phone number\n\n` +
      `I'll populate the form as you provide each detail.`
    );
  }

  if (normalizedBody === "VETASSESS" || normalizedBody.includes("VETASSESS")) {
    return (
      `Hi ${firstName}! I'm here to help you prepare your skills assessment documents for **${bodyName}** ` +
      `for the occupation **${occupationTitle}** (ANZSCO ${anzscoCode}).\n\n` +
      `VETASSESS assesses your qualifications and employment against the ANZSCO unit group descriptors. ` +
      `To begin, could you describe your main duties and responsibilities in your current or most recent role?\n\n` +
      `I'll align your duties with the ANZSCO task descriptors for your nominated occupation to ensure ` +
      `they meet VETASSESS requirements.`
    );
  }

  if (
    normalizedBody === "ENGINEERS AUSTRALIA" ||
    normalizedBody === "EA" ||
    normalizedBody.includes("ENGINEERS")
  ) {
    return (
      `Hi ${firstName}! I'm here to help you prepare your skills assessment documents for **${bodyName}** ` +
      `for the occupation **${occupationTitle}** (ANZSCO ${anzscoCode}).\n\n` +
      `Engineers Australia assesses your engineering competencies through the Competency Demonstration Report (CDR). ` +
      `To get started, could you tell me about your engineering competencies?\n\n` +
      `1. What type of engineering do you practice?\n` +
      `2. Can you describe a key engineering project where you applied your technical skills?\n\n` +
      `This will help me guide you through preparing your Career Episodes and Summary Statement.`
    );
  }

  if (
    normalizedBody === "TRA" ||
    normalizedBody.includes("TRADES RECOGNITION") ||
    normalizedBody.includes("TRA")
  ) {
    return (
      `Hi ${firstName}! I'm here to help you prepare your skills assessment documents for **${bodyName}** ` +
      `for the occupation **${occupationTitle}** (ANZSCO ${anzscoCode}).\n\n` +
      `TRA assesses your trade qualifications and practical skills. To begin, I need to understand:\n\n` +
      `1. What trade qualifications do you hold (certificates, licenses, etc.)?\n` +
      `2. How many years of experience do you have in this trade?\n` +
      `3. In which country did you obtain your trade qualification?\n\n` +
      `This will help me determine the right assessment pathway for your trade occupation.`
    );
  }

  // Default fallback for other assessing bodies
  return (
    `Hi ${firstName}! I'm here to help you prepare your skills assessment documents for **${bodyName}** ` +
    `for the occupation **${occupationTitle}** (ANZSCO ${anzscoCode}).\n\n` +
    `To get started, could you tell me about your current or most recent role? ` +
    `I'd like to understand your key duties and responsibilities so I can help prepare your documents.`
  );
}

/**
 * Extract the list of document tab labels from an assessing body's
 * required_documents field. Falls back to a default set if missing.
 */
export function getDocumentTabs(
  assessingBody: AssessingBodyRequirement | null,
): string[] {
  const defaults = [
    "Employment Reference",
    "CV/Resume",
    "Cover Letter",
    "Statutory Declaration",
    "Document Checklist",
    "Submission Guide",
  ];

  if (!assessingBody?.required_documents) {
    return defaults;
  }

  const docs = assessingBody.required_documents;

  // Handle array of type strings (e.g., { types: ["employment_reference", ...] })
  if (Array.isArray((docs as Record<string, unknown>).types)) {
    return ((docs as Record<string, unknown>).types as string[]).map(
      formatDocumentType,
    );
  }

  // Handle direct array
  if (Array.isArray(docs)) {
    return (docs as string[]).map(formatDocumentType);
  }

  return defaults;
}

/**
 * Convert a snake_case document type string to a human-readable label.
 */
export function formatDocumentType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

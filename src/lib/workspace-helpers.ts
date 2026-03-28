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
  matchLevel?: string;
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
 * Uses known profile data from Phase 1 and never re-asks for it.
 * Matches exact format from DocGen Brief 3.1.
 */
export function generateFirstMessage(
  data: WorkspaceAssessmentData,
  assessingBody: AssessingBodyRequirement | null,
): string {
  const { occupationTitle, anzscoCode, assessingAuthority, profileData, matchLevel } = data;
  const firstName = (profileData.firstName as string) || "there";
  const jobTitle = (profileData.jobTitle as string) || "";
  const bodyName = assessingBody?.body_name || assessingAuthority || "your assessing body";
  const level = matchLevel || "Strong";

  // DocGen Brief 3.1: exact opening message format
  const jobContext = jobTitle ? ` based on your ${jobTitle} background` : "";

  return (
    `Hi ${firstName}. You're applying for **${occupationTitle}** (ANZSCO ${anzscoCode}) ` +
    `through **${bodyName}** \u2014 this is your **${level} Match**${jobContext}.\n\n` +
    `I already have your name and email. Before we start, would you like to upload your CV? ` +
    `If you do, I'll extract your employment history and qualifications automatically and ` +
    `we can skip a lot of the basic questions.\n\n` +
    `Or we can go through it step by step. Let's start with your **most recent employer**:\n\n` +
    `1. Company name\n` +
    `2. Your job title there\n` +
    `3. Start and end date (or "current")\n` +
    `4. Was this full-time (35+ hours/week)?`
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

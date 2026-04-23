/**
 * Workspace helper utilities for generating body-specific first messages,
 * extracting document tab labels, and managing workspace state.
 */

import type { AssessingBodyRequirement, BodyUiConfig } from "@/types/database";

/**
 * Bodies onboarded to the paid document workspace. Soft gate for the
 * occupation picker / results page — non-supported bodies are greyed
 * out with a "coming soon" affordance.
 *
 * Source of truth is `assessing_body_requirements.ui_config` in DB;
 * this list mirrors the bodies that have a non-null ui_config row.
 * When onboarding a new body: seed ui_config in a migration, then add
 * its body_name here.
 */
const SUPPORTED_BODY_NAMES = [
  "ACS",
  "Engineers Australia",
  "TRA",
  "VETASSESS",
] as const;

const DEFAULT_UI_CONFIG: BodyUiConfig = {
  pathway_label: "Skills Assessment",
  sidebar_layout: "chat-only",
  primary_document_types: ["employment_reference"],
};

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

function normalizeAuthority(authority: string): string {
  const trimmed = authority.toUpperCase().trim();
  if (trimmed === "ACS" || trimmed.includes("AUSTRALIAN COMPUTER SOCIETY")) {
    return "ACS";
  }
  if (trimmed.startsWith("VETASSESS")) return "VETASSESS";
  if (trimmed === "TRA" || trimmed.includes("TRADES RECOGNITION")) return "TRA";
  if (trimmed.includes("ENGINEERS AUSTRALIA")) return "Engineers Australia";
  return authority.trim();
}

/**
 * Returns true when the body has been onboarded to the paid document
 * workspace. Used for soft-gating the occupation picker / results page.
 */
export function isSupportedBody(authority: string): boolean {
  const normalized = normalizeAuthority(authority);
  return (SUPPORTED_BODY_NAMES as readonly string[]).includes(normalized);
}

/**
 * Returns true when the body uses the ACS-style form sidebar in the
 * workspace. Today this is ACS-only; other bodies use `chat-only`.
 * Kept narrow (separate from isSupportedBody) so widening the supported
 * list doesn't accidentally activate the ACS form for other bodies.
 */
export function hasAcsFormSidebar(authority: string): boolean {
  return normalizeAuthority(authority) === "ACS";
}

/**
 * Merge a body's ui_config with sensible defaults. Accepts the full
 * assessing_body_requirements row (nullable — older rows may not have
 * ui_config populated yet).
 */
export function getBodyUiConfig(
  assessingBody: AssessingBodyRequirement | null | undefined,
): BodyUiConfig {
  return { ...DEFAULT_UI_CONFIG, ...(assessingBody?.ui_config ?? {}) };
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

/**
 * Pure projector from a raw `conversations` row into a typed, phase-aware
 * shape consumed by the unified chat experience.
 */

export type ConversationPhase =
  | "phase1"
  | "awaiting_payment"
  | "paid"
  | "phase2"
  | "done";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ConversationDocument {
  id: string;
  document_type: string;
  title: string;
  status: string;
  content: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  assessment_id: string | null;
  status: ConversationPhase;
  profile_data: Record<string, unknown> | null;
  points_breakdown: Record<string, unknown> | null;
  matched_occupations: unknown;
  selected_anzsco_code: string | null;
  cv_data: Record<string, unknown> | null;
  paid_at: string | null;
  messages: ChatMessage[] | null;
  submission_guide_data?: Record<string, unknown> | null;
  submission_guide_generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectedConversation {
  id: string;
  userId: string;
  phase: ConversationPhase;
  profile: Record<string, unknown>;
  points: Record<string, unknown> | null;
  matches: unknown[];
  selectedAnzscoCode: string | null;
  cvData: Record<string, unknown> | null;
  paidAt: string | null;
  messages: ChatMessage[];
  documents: ConversationDocument[];
}

export function projectConversation(
  row: ConversationRow,
  documents: ConversationDocument[] = [],
): ProjectedConversation {
  const matchesRaw = row.matched_occupations;
  let matches: unknown[] = [];
  if (Array.isArray(matchesRaw)) {
    matches = matchesRaw;
  } else if (matchesRaw && typeof matchesRaw === "object") {
    const r = matchesRaw as Record<string, unknown>;
    if (Array.isArray(r.matches)) matches = r.matches;
    else if (Array.isArray(r.skillsMatches) || Array.isArray(r.employerMatches)) {
      matches = [
        ...((r.skillsMatches as unknown[]) ?? []),
        ...((r.employerMatches as unknown[]) ?? []),
      ];
    } else {
      matches = [matchesRaw];
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    phase: row.status,
    profile: row.profile_data ?? {},
    points: row.points_breakdown ?? null,
    matches,
    selectedAnzscoCode: row.selected_anzsco_code,
    cvData: row.cv_data,
    paidAt: row.paid_at,
    messages: Array.isArray(row.messages) ? row.messages : [],
    documents,
  };
}

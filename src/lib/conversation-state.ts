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
}

export function projectConversation(row: ConversationRow): ProjectedConversation {
  const matchesRaw = row.matched_occupations;
  const matches: unknown[] = Array.isArray(matchesRaw)
    ? matchesRaw
    : matchesRaw && typeof matchesRaw === "object"
      ? [matchesRaw]
      : [];

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
  };
}

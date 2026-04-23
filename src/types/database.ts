/**
 * TypeScript interfaces matching all Supabase database tables.
 * These types are the source of truth for database row shapes.
 */

export interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  visa_status: string | null;
  job_title: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Occupation {
  id: string;
  anzsco_code: string;
  title: string;
  skill_level: number | null;
  assessing_authority: string | null;
  mltssl: boolean;
  stsol: boolean;
  csol: boolean;
  rol: boolean;
  min_189_points: number | null;
  qualification_level_required: string | null;
  unit_group_description: string | null;
  industry_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AgentKnowledge {
  id: string;
  anzsco_code: string;
  strategic_advice: string | null;
  common_pitfalls: string | null;
  recommended_approach: string | null;
  tips_and_hacks: string | null;
  custom_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StateNomination {
  id: string;
  state: string;
  anzsco_code: string;
  occupation_title: string | null;
  visa_190: string | null;
  visa_491: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitationRound {
  id: string;
  round_date: string | null;
  visa_subclass: string | null;
  anzsco_code: string | null;
  minimum_points: number | null;
  invitations_issued: number | null;
  created_at: string;
}

export interface Assessment {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  profile_data: Record<string, unknown>;
  points_breakdown: Record<string, unknown>;
  total_points: number;
  matched_occupations: Record<string, unknown>;
  selected_anzsco_code: string | null;
  cv_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BodyUiConfig {
  pathway_label?: string;
  sidebar_layout?: "acs-form" | "chat-only";
  primary_document_types?: string[];
  paywall?: {
    title?: string;
    value_prop?: string;
    cta_label?: string;
  };
}

export type EligibilityPredicate =
  | { field: string; equals: string | number | boolean }
  | { field: string; in: Array<string | number> }
  | { field: string; band_min: string };

export interface EligibilityRules {
  paid_path_requires_any_of: EligibilityPredicate[];
  else_action: "paywall" | "calendly";
}

export interface AssessingBodyRequirement {
  id: string;
  body_name: string;
  required_documents: Record<string, unknown> | null;
  duty_descriptors: Record<string, unknown> | null;
  qualification_requirements: Record<string, unknown> | null;
  experience_requirements: Record<string, unknown> | null;
  formatting_notes: string | null;
  conversation_template: Record<string, unknown> | null;
  ui_config?: BodyUiConfig | null;
  eligibility_rules?: EligibilityRules | null;
  knowledge_md?: string | null;
  knowledge_scraped_at?: string | null;
  knowledge_sources?: Array<{ url: string; scraped_at: string; status?: string }> | null;
  active_revision_id?: string | null;
  portal_schema?: Record<string, unknown> | null;
  portal_schema_captured_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessingBodyKnowledgeRevision {
  id: string;
  body_id: string;
  knowledge_md: string;
  scraped_at: string;
  sources: Array<{ url: string; scraped_at: string; status?: string }> | null;
  diff_summary: string | null;
  promoted_at: string | null;
  promoted_by: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  assessment_id: string;
  user_id: string | null;
  document_type: string;
  title: string | null;
  content: Record<string, unknown> | null;
  storage_path: string | null;
  status: "draft" | "in_review" | "approved";
  declaration_confirmed_at: string | null;
  declaration_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  assessment_id: string;
  user_id: string | null;
  messages: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  assessment_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase-compatible database type definition.
 * Maps table names to their Row, Insert, and Update types.
 */
export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Lead, 'id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      occupations: {
        Row: Occupation;
        Insert: Omit<Occupation, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Occupation, 'id'>>;
      };
      agent_knowledge: {
        Row: AgentKnowledge;
        Insert: Omit<AgentKnowledge, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<AgentKnowledge, 'id'>>;
      };
      state_nominations: {
        Row: StateNomination;
        Insert: Omit<StateNomination, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<StateNomination, 'id'>>;
      };
      invitation_rounds: {
        Row: InvitationRound;
        Insert: Omit<InvitationRound, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<InvitationRound, 'id'>>;
      };
      assessments: {
        Row: Assessment;
        Insert: Omit<Assessment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Assessment, 'id'>>;
      };
      assessing_body_requirements: {
        Row: AssessingBodyRequirement;
        Insert: Omit<AssessingBodyRequirement, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<AssessingBodyRequirement, 'id'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Document, 'id'>>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Conversation, 'id'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'metadata'> & { id?: string; created_at?: string; updated_at?: string; metadata?: Record<string, unknown> };
        Update: Partial<Omit<Payment, 'id'>>;
      };
    };
  };
}

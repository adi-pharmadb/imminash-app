# Specification: Smart Occupation Matching & Agent Knowledge System

## Goal
Upgrade Imminash's occupation matching from a basic AI picker to an agent-intelligence-powered system with a database-backed knowledge base, confidence-scored matching with ANZSCO validation, and enhanced results cards that display reasoning, state availability summaries, and agent booking CTAs.

## User Stories
- As a skilled visa applicant, I want to see confidence percentages with clear reasoning for each matched occupation so that I understand why an occupation was suggested and how strong the match actually is.
- As migration agent Kunal, I want a simple admin panel where I can add strategic advice, tips, and warnings per occupation so that my domain expertise feeds directly into the AI matching pipeline without touching code.

## Specific Requirements

**Agent Knowledge Base Database Table**
- Create new `agent_knowledge` table with columns: `id` (uuid PK), `anzsco_code` (text, FK to occupations), `strategic_advice` (text), `common_pitfalls` (text), `recommended_approach` (text), `tips_and_hacks` (text), `custom_notes` (text), `created_at` (timestamptz), `updated_at` (timestamptz)
- Add unique index on `anzsco_code` so there is one knowledge entry per occupation
- RLS: public read for anon/authenticated (same pattern as occupations table), write restricted to admin role
- Admin role check uses a simple allowlist of Supabase user IDs stored in an environment variable `ADMIN_USER_IDS` (comma-separated)

**Agent Knowledge Admin UI**
- New route at `/admin/knowledge` protected by Supabase auth + admin role check
- List view showing all occupations with a search/filter by title or ANZSCO code, indicating which ones have knowledge entries
- Click into an occupation to open an edit form with all 5 text fields (strategic_advice, common_pitfalls, recommended_approach, tips_and_hacks, custom_notes)
- Each field uses a textarea with auto-save or explicit save button
- Redirect to login if unauthenticated; show "Access Denied" if authenticated but not admin
- Use existing shadcn/ui components (Input, Button, Textarea, Card) for the form

**Occupations Table Schema Enhancements**
- Add three new columns to the `occupations` table via migration: `qualification_level_required` (text, nullable), `unit_group_description` (text, nullable), `industry_keywords` (text[], nullable -- Postgres text array)
- Create a seed script or migration that populates these fields from the ANZSCO 1220.0 First Edition Rev 1 PDF located at `/docs/`
- `unit_group_description` should contain the official ANZSCO unit group description text for each occupation's 4-digit unit group
- `qualification_level_required` maps to the ANZSCO skill level description (e.g., "Bachelor degree or higher", "AQF Associate Degree, Advanced Diploma or Diploma")
- `industry_keywords` stores relevant industry/domain terms extracted from the unit group description and occupation specialisations

**Smarter AI Matching Pipeline**
- Two-phase approach for maximum accuracy: (1) pre-filter candidates using qualification level and industry keywords before sending to the AI, (2) enhanced AI call that includes unit group descriptions and agent knowledge in the prompt so Claude can validate against official ANZSCO duties
- Pre-filtering: score each occupation by keyword overlap with user's field of study, job title, and duties, then take the top 30 candidates (instead of sending all 500+ occupations) to reduce noise and improve AI focus
- Enhanced AI prompt includes: user profile, pre-filtered occupation list with their unit group descriptions, agent knowledge notes (if any exist for those occupations), and explicit instruction to return confidence percentages (0-100) with reasoning
- Update the Anthropic tool schema (`return_matched_occupations`) to return objects instead of strings: each match includes `title` (string), `confidence` (number 0-100), `reasoning` (string explaining why this matched), `experience_alignment` (boolean -- whether user's experience aligns with ANZSCO duties), `warnings` (string[] -- any concerns like qualification gap, experience mismatch)
- Return top 5 skills matches and top 3 employer matches from the AI, then validate against canonical titles, then trim to top 3 skills + top 2 employer for display

**Confidence Scoring and Weak Match Handling**
- Confidence percentage replaces the old `matchLevel` ("High"/"Medium"/"Low") throughout the entire system
- Color mapping: 80-100% = green (`oklch(0.72 0.17 155)`), 61-79% = amber (`oklch(0.78 0.12 70)`), 0-60% = red (`oklch(0.65 0.2 25)`)
- 60% or below triggers a weak match warning banner on the card with text: "This match may not be strong enough for a successful application"
- 60% or below also triggers an agent booking CTA: "Book a consultation with Kunal to explore your options" with a placeholder URL
- Non-ACS assessing authority matches also show the agent booking CTA regardless of confidence score

**Enhanced Results Cards (OccupationCard)**
- Replace `MatchBadge` component: instead of "High Match" / "Medium Match" / "Low Match", display the confidence percentage (e.g., "87% Match") with the same pill shape, using green/amber/red color based on the ranges above
- Add a new "Why it matched" section below the header showing the AI-generated reasoning text (2-3 sentences max)
- Add a condensed state invitation summary line on the card (e.g., "NSW, VIC, QLD inviting" or "NSW, VIC + 3 more states inviting") derived from existing `StateEligibility` data; show only states with at least one eligible visa
- Keep the full `StateNominationMatrix` component as an expandable/collapsible detail view below the summary line (collapsed by default)
- Add invitation round data display: show the most recent round date and minimum points for this ANZSCO code, sourced from the `invitation_rounds` table
- Add warnings section: if the AI returned experience alignment warnings, display them as amber alert items below the reasoning
- Agent booking CTA card section for weak matches (<=60%) and non-ACS matches: "Need help with this occupation? Book a session with Kunal" with placeholder link

**Enhanced Employer Sponsored Cards (EmployerCard)**
- Apply the same confidence percentage badge treatment to employer cards
- Add "Why it matched" reasoning text
- Add agent booking CTA for weak matches and non-standard pathways

**Stepper Page 5 (Role Details) - Mandatory with Validation**
- Remove `skippable: true` from Page 5's `PageDef` in `StepperFlow.tsx`
- Remove the `optional` prop from the `StepperField` in `StepperPage5.tsx`
- Add `isValid` function for Page 5: `(d) => (d.jobDuties?.trim().length ?? 0) >= 50`
- Update the textarea hint text to: "Describe your daily tasks and responsibilities in detail. The more specific you are, the more accurate your occupation matches will be. Minimum 50 characters."
- Add a character counter below the textarea showing current length vs 50 minimum
- Update placeholder text to be more descriptive: "e.g., I design and develop web applications using React and Node.js, conduct code reviews, write technical documentation, manage deployments to AWS, and mentor junior developers on best practices..."

**API Route Enhancements (`POST /api/match-occupations`)**
- Fetch agent_knowledge entries for the pre-filtered occupations and include them in the AI prompt
- Fetch unit_group_description and industry_keywords from the occupations table (expand the existing select query)
- Update the response shape: each match object now includes `confidence` (number), `reasoning` (string), `experience_aligned` (boolean), `warnings` (string[]) in addition to existing fields
- Fetch the most recent invitation round for each matched ANZSCO code and include `latest_invitation` object with `round_date`, `minimum_points`, `invitations_issued`
- Update Zod validation: `jobDuties` field minimum changes from empty default to `z.string().min(50).max(1000)`

**Type System Updates**
- Update `MatchResult` in `assessment.ts`: remove `match_level`, add `confidence` (number), `reasoning` (string), `experience_aligned` (boolean), `warnings` (string[]), `latest_invitation` ({ round_date: string | null, minimum_points: number | null, invitations_issued: number | null } | null)
- Update `Occupation` in `database.ts`: add `qualification_level_required` (string | null), `unit_group_description` (string | null), `industry_keywords` (string[] | null)
- Add new `AgentKnowledge` interface in `database.ts` matching the new table
- Update the `Database` type map to include the `agent_knowledge` table
- Remove `MatchLevel` type and `assignMatchLevel` function from `occupation-matching.ts`; replace with confidence-based color logic

## Visual Design
No visual assets provided. Follow existing design system: dark theme with oklch color palette, glass-card styling, glow-amber accents. All new UI elements should match the existing component patterns.

## Existing Code to Leverage

**`src/lib/occupation-matching.ts` (current matching logic)**
- Contains `buildMatchingPrompt()`, `aiMatchOccupations()`, `validateAgainstCanonical()`, and `keywordMatchOccupations()` functions that form the existing pipeline
- The `matchOccupations()` orchestrator function should be refactored to add the pre-filtering step, enhanced prompt, and new response shape while keeping the keyword fallback as a safety net
- `MATCH_OCCUPATIONS_TOOL` schema needs to be updated to return objects with confidence/reasoning instead of plain strings

**`src/app/api/match-occupations/route.ts` (API endpoint)**
- Already fetches occupations from Supabase and builds a lookup map by title for enrichment
- The `enrichMatch()` function should be extended to include the new fields (confidence, reasoning, warnings, latest_invitation)
- Already handles graceful error fallback returning empty arrays

**`src/components/results/MatchBadge.tsx` (badge component)**
- Currently takes `level: "High" | "Medium" | "Low"` and renders a colored pill
- Refactor to accept `confidence: number` instead, compute color from percentage ranges, and display "87% Match" format
- Reuse the existing oklch color values already defined in `BADGE_STYLES`

**`src/components/results/OccupationCard.tsx` (card component)**
- Currently composes MatchBadge, PointsGap, StatGrid, PathwaySignals, and StateNominationMatrix
- Extend props to accept new fields (confidence, reasoning, warnings, latest_invitation, state summary)
- Add new sections between existing ones for reasoning, warnings, invitation data, state summary, and agent booking CTA

**`supabase/migrations/` and `supabase/seed.sql` (migration patterns)**
- Follow the existing naming convention: `YYYYMMDD######_description.sql` (e.g., `20260323000001_add_agent_knowledge.sql`)
- Follow the existing RLS pattern: public read for reference tables, admin write via service role
- Seed data pattern established in `seed.sql` uses `ON CONFLICT ... DO UPDATE` for idempotent inserts

## Out of Scope
- Calendly or Cal.com integration for agent booking (placeholder link only)
- Payment processing or subscription management
- Phase 2 document workspace changes (no modifications to chat, document generation, or workspace UI)
- Changes to the points calculator logic or point values
- Changes to the authentication flow (magic link, email gate remain as-is)
- Modifications to the landing/hero page
- Adding new assessing bodies beyond the existing Big 4
- Real-time notifications or webhook integrations
- Multi-language / i18n support
- Automated ANZSCO PDF parsing pipeline (manual/scripted seed is acceptable for the initial population)

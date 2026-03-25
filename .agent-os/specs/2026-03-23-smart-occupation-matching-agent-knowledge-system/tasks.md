# Task Breakdown: Smart Occupation Matching & Agent Knowledge System

## Overview
Total Tasks: 7 Task Groups, ~45 sub-tasks

## Task List

### Database Layer

#### Task Group 1: Schema Migrations & Data Seeding
**Dependencies:** None

- [x] 1.0 Complete database schema changes and seed data
  - [x] 1.1 Write 4 focused tests for database schema changes
    - Test that `agent_knowledge` table accepts valid inserts and enforces unique `anzsco_code`
    - Test that `occupations` table new columns (`qualification_level_required`, `unit_group_description`, `industry_keywords`) accept correct types including text array
    - Test RLS: anon/authenticated can SELECT from `agent_knowledge`; non-admin authenticated cannot INSERT/UPDATE
    - Test that `agent_knowledge` FK relationship to occupations via `anzsco_code` works correctly
  - [x] 1.2 Create migration `20260323000001_add_agent_knowledge.sql`
    - Create `agent_knowledge` table: `id` (uuid PK), `anzsco_code` (text, unique, FK to occupations), `strategic_advice` (text), `common_pitfalls` (text), `recommended_approach` (text), `tips_and_hacks` (text), `custom_notes` (text), `created_at` (timestamptz), `updated_at` (timestamptz)
    - Add unique index on `anzsco_code`
    - Enable RLS on the table
    - File: `supabase/migrations/20260323000001_add_agent_knowledge.sql`
  - [x] 1.3 Create migration `20260323000002_add_occupation_enrichment_columns.sql`
    - ALTER `occupations` table to add: `qualification_level_required` (text, nullable), `unit_group_description` (text, nullable), `industry_keywords` (text[], nullable)
    - File: `supabase/migrations/20260323000002_add_occupation_enrichment_columns.sql`
  - [x] 1.4 Create migration `20260323000003_add_agent_knowledge_rls.sql`
    - Add RLS policy: public read for anon/authenticated (same pattern as `public_read_occupations` in `20260318000010_add_rls_policies.sql`)
    - Add RLS policy: write restricted -- use service role for admin writes (admin check happens at the API layer via `ADMIN_USER_IDS` env var)
    - File: `supabase/migrations/20260323000003_add_agent_knowledge_rls.sql`
  - [x] 1.5 Create seed script for occupation enrichment data
    - Parse/extract data from the ANZSCO PDF at `docs/ANZSCO - Australian and New Zealand Standard Classification of Occupations First Edition, Revision 1.pdf`
    - Populate `qualification_level_required` with ANZSCO skill level descriptions (e.g., "Bachelor degree or higher")
    - Populate `unit_group_description` with official ANZSCO unit group description text per 4-digit unit group
    - Populate `industry_keywords` with relevant industry/domain terms extracted from unit group descriptions and specialisations
    - Use `ON CONFLICT (anzsco_code) DO UPDATE` for idempotent execution (matching existing `seed.sql` pattern)
    - File: `supabase/seed-occupation-enrichment.sql` (or extend `supabase/seed.sql`)
  - [x] 1.6 Ensure database layer tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify all 3 migrations apply cleanly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4 tests from 1.1 pass
- `agent_knowledge` table exists with correct schema, unique constraint, and RLS
- `occupations` table has the 3 new nullable columns
- Seed data populates enrichment fields for all occupations with ANZSCO data
- Migrations are reversible (follow standards)

---

### Type System & Shared Logic

#### Task Group 2: TypeScript Types & Matching Pipeline
**Dependencies:** Task Group 1

- [x] 2.0 Complete type system updates and matching logic refactor
  - [x] 2.1 Write 6 focused tests for the matching pipeline
    - Test pre-filtering: `preFilterOccupations()` returns top 30 candidates ranked by keyword overlap with user profile
    - Test that enhanced AI tool schema returns objects with `confidence`, `reasoning`, `experience_alignment`, `warnings` (not plain strings)
    - Test `validateAgainstCanonical()` still works with the new object-based match format
    - Test confidence color mapping: 80-100 returns green, 61-79 returns amber, 0-60 returns red
    - Test weak match detection: confidence <= 60 returns `isWeakMatch: true`
    - Test keyword fallback still works when AI returns null (backward compatibility)
  - [x] 2.2 Update `MatchResult` interface in `src/types/assessment.ts`
    - Remove `match_level` field
    - Add: `confidence` (number), `reasoning` (string), `experience_aligned` (boolean), `warnings` (string[]), `latest_invitation` ({ round_date: string | null, minimum_points: number | null, invitations_issued: number | null } | null)
    - Update `Occupation` interface: add `qualification_level_required` (string | null), `unit_group_description` (string | null), `industry_keywords` (string[] | null)
  - [x] 2.3 Update `src/types/database.ts`
    - Add `AgentKnowledge` interface matching the new table schema
    - Add `agent_knowledge` entry to the `Database` type map
    - Update `Occupation` interface to include the 3 new columns
  - [x] 2.4 Refactor `src/lib/occupation-matching.ts` -- pre-filtering
    - Add `preFilterOccupations()` function: score each occupation by keyword overlap with user's field of study, job title, duties, and `industry_keywords`; return top 30 candidates
    - Use the new `qualification_level_required` and `industry_keywords` fields for scoring
    - Keep `keywordMatchOccupations()` as a fallback but update `assignMatchLevel()` usage -- replace with confidence-based logic
  - [x] 2.5 Refactor `src/lib/occupation-matching.ts` -- enhanced AI prompt
    - Update `MATCH_OCCUPATIONS_TOOL` schema: items become objects with `title` (string), `confidence` (number 0-100), `reasoning` (string), `experience_alignment` (boolean), `warnings` (string[])
    - Update `buildMatchingPrompt()` to accept and include: pre-filtered occupation list with unit group descriptions, agent knowledge notes per occupation, explicit instruction to return confidence percentages with reasoning
    - Update `aiMatchOccupations()` to parse the new object-based tool response
    - Top 5 skills + top 3 employer from AI, validate against canonical, then trim to top 3 skills + top 2 employer
  - [x] 2.6 Refactor `matchOccupations()` orchestrator in `src/lib/occupation-matching.ts`
    - Accept enriched occupation data (with `unit_group_description`, `industry_keywords`) and `AgentKnowledge[]` as new parameters
    - Wire: pre-filter -> enhanced AI call -> canonical validation -> trim -> return
    - Remove `MatchLevel` type export and `assignMatchLevel()` function
    - Add confidence color utility: `getConfidenceColor(confidence: number)` returning the oklch values
  - [x] 2.7 Update Zod schema in `occupation-matching.ts`
    - Change `jobDuties` from `z.string().max(1000).default("")` to `z.string().min(50).max(1000)`
    - This enforces the mandatory 50-char minimum server-side
  - [x] 2.8 Ensure matching pipeline tests pass
    - Run ONLY the 6 tests written in 2.1
    - Verify type compilation with `tsc --noEmit`
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6 tests from 2.1 pass
- TypeScript compiles without errors after type changes
- Pre-filtering reduces 500+ occupations to top 30 candidates
- AI prompt includes unit group descriptions and agent knowledge
- Tool schema returns confidence/reasoning/warnings per match
- Zod enforces 50-char minimum for `jobDuties`
- `MatchLevel` type and `assignMatchLevel` are fully removed

---

### API Layer

#### Task Group 3: API Route Enhancements
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete API route updates
  - [x] 3.1 Write 4 focused tests for the API endpoint
    - Test `POST /api/match-occupations` returns matches with `confidence`, `reasoning`, `experience_aligned`, `warnings` fields
    - Test that `latest_invitation` data is included in response when invitation round data exists
    - Test validation rejects `jobDuties` shorter than 50 characters with 400 status
    - Test graceful fallback: returns empty arrays on AI failure (existing behavior preserved)
  - [x] 3.2 Update `src/app/api/match-occupations/route.ts` -- data fetching
    - Expand the occupations SELECT query to include `qualification_level_required`, `unit_group_description`, `industry_keywords`
    - Add query to fetch `agent_knowledge` entries for the pre-filtered occupations (fetch after pre-filter, before AI call)
    - Add query to fetch the most recent `invitation_rounds` entry per matched ANZSCO code (after matching, before response)
  - [x] 3.3 Update `enrichMatch()` in the route
    - Include `confidence` (number), `reasoning` (string), `experience_aligned` (boolean), `warnings` (string[]) from the new match result shape
    - Include `latest_invitation` object with `round_date`, `minimum_points`, `invitations_issued` from the invitation rounds query
    - Remove `matchLevel` / `match_level` from the response
  - [x] 3.4 Create admin knowledge API routes
    - `GET /api/admin/knowledge` -- list all agent knowledge entries (join with occupations for title/code), protected by auth + admin check
    - `PUT /api/admin/knowledge/[anzsco_code]` -- upsert agent knowledge entry, protected by auth + admin check
    - Admin check: verify Supabase user ID is in `ADMIN_USER_IDS` env var (comma-separated allowlist)
    - Use Supabase service role client for write operations (RLS write is restricted)
    - Files: `src/app/api/admin/knowledge/route.ts`, `src/app/api/admin/knowledge/[anzsco_code]/route.ts`
  - [x] 3.5 Create admin auth helper
    - Utility function `isAdmin(userId: string): boolean` that checks against `ADMIN_USER_IDS` env var
    - File: `src/lib/auth-helpers.ts` (extend existing file)
  - [x] 3.6 Ensure API layer tests pass
    - Run ONLY the 4 tests written in 3.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4 tests from 3.1 pass
- Match response includes confidence, reasoning, warnings, latest_invitation
- Admin API endpoints are protected by auth + admin role check
- Validation rejects short `jobDuties` with clear error message
- Graceful error handling preserved

---

### Frontend -- Stepper Updates

#### Task Group 4: Stepper Page 5 Mandatory Duties
**Dependencies:** None (can run in parallel with Task Groups 1-3)

- [x] 4.0 Complete stepper Page 5 updates
  - [x] 4.1 Write 3 focused tests for Page 5 changes
    - Test that Page 5 is no longer skippable (no "Skip this" button rendered)
    - Test that Continue button is disabled when `jobDuties` is fewer than 50 characters
    - Test that character counter displays current length and shows minimum requirement
  - [x] 4.2 Update `PAGE_DEFS` in `src/components/stepper/StepperFlow.tsx`
    - Remove `skippable: true` from Page 5's `PageDef` (id: 5)
    - Add `isValid` function: `(d) => (d.jobDuties?.trim().length ?? 0) >= 50`
    - Keep the `condition` check (only shown if working/was working)
  - [x] 4.3 Update `src/components/stepper/StepperPage5.tsx`
    - Remove the `optional` prop from the `StepperField`
    - Update hint text to: "Describe your daily tasks and responsibilities in detail. The more specific you are, the more accurate your occupation matches will be. Minimum 50 characters."
    - Update placeholder to: "e.g., I design and develop web applications using React and Node.js, conduct code reviews, write technical documentation, manage deployments to AWS, and mentor junior developers on best practices..."
    - Add character counter below textarea: show `{current}/50 minimum` with color feedback (red below 50, muted at/above 50)
  - [x] 4.4 Ensure stepper tests pass
    - Run ONLY the 3 tests written in 4.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3 tests from 4.1 pass
- Page 5 is mandatory when shown (no skip option)
- Continue is disabled until 50+ characters entered
- Character counter provides clear visual feedback
- Hint and placeholder text updated

---

### Frontend -- Results Cards

#### Task Group 5: Enhanced Results Cards & Match Badge
**Dependencies:** Task Groups 2, 3 (needs new type definitions and API response shape)

- [x] 5.0 Complete results card enhancements
  - [x] 5.1 Write 6 focused tests for results card components
    - Test `MatchBadge` renders percentage (e.g., "87% Match") with correct color for green/amber/red ranges
    - Test `OccupationCard` renders "Why it matched" reasoning section
    - Test `OccupationCard` renders weak match warning banner when confidence <= 60
    - Test `OccupationCard` renders agent booking CTA for weak matches and non-ACS assessing authorities
    - Test `OccupationCard` renders condensed state invitation summary (e.g., "NSW, VIC + 3 more states inviting")
    - Test `EmployerCard` renders confidence badge and reasoning text
  - [x] 5.2 Refactor `src/components/results/MatchBadge.tsx`
    - Change props from `level: "High" | "Medium" | "Low"` to `confidence: number`
    - Compute color from percentage ranges: 80-100 = green (`oklch(0.72 0.17 155)`), 61-79 = amber (`oklch(0.78 0.12 70)`), 0-60 = red (`oklch(0.65 0.2 25)`)
    - Display format: "{confidence}% Match" (e.g., "87% Match")
    - Keep existing pill shape, className patterns, and `data-testid="match-badge"`
    - Add glow shadow for green range (80-100) matching existing `BADGE_STYLES.High.shadow`
  - [x] 5.3 Update `src/components/results/OccupationCard.tsx` -- new sections
    - Update `OccupationCardProps` to accept new fields: `confidence`, `reasoning`, `warnings`, `experienceAligned`, `latestInvitation`, `stateInvitingSummary`
    - Replace `<MatchBadge level={...} />` with `<MatchBadge confidence={...} />`
    - Add "Why it matched" section below header: render `reasoning` text in 2-3 sentences, styled as muted text
    - Add condensed state invitation summary line (e.g., "NSW, VIC, QLD inviting" or "NSW, VIC + 3 more states inviting") derived from `stateEligibility` data, showing only states with at least one eligible visa
    - Collapse `StateNominationMatrix` by default (add expandable/collapsible wrapper with "Show all states" toggle)
    - Add invitation round data: most recent round date and minimum points for this ANZSCO, below the stat grid
    - Add warnings section: if AI returned warnings, display as amber alert items below reasoning
    - Add agent booking CTA section for weak matches (confidence <= 60) and non-ACS assessing authorities: "Need help with this occupation? Book a session with Kunal" with placeholder link
    - Add weak match warning banner for confidence <= 60: "This match may not be strong enough for a successful application"
  - [x] 5.4 Create state invitation summary utility
    - Function to compute condensed summary from `StateEligibility[]`: returns formatted string like "NSW, VIC, QLD inviting" or "NSW, VIC + 3 more states inviting"
    - Show only states with at least one eligible visa (visa_190 or visa_491 not null/empty)
    - If more than 3 states, show first 2 + "+ N more states inviting"
    - File: `src/lib/state-nominations.ts` (extend existing file)
  - [x] 5.5 Update `src/components/results/EmployerCard.tsx`
    - Add `MatchBadge` with confidence percentage (same as OccupationCard treatment)
    - Add "Why it matched" reasoning text section
    - Add agent booking CTA for weak matches (confidence <= 60) and non-standard pathways
    - Update `EmployerCardProps` to accept `confidence`, `reasoning`, `warnings`
  - [x] 5.6 Update results page to pass new props
    - Update `src/app/results/page.tsx` to pass new fields from API response to card components
    - Compute state invitation summary from existing `stateEligibility` data
    - Pass `latestInvitation` data to `OccupationCard`
    - Handle backward compatibility: default `confidence` to 0 if missing from older assessments
  - [x] 5.7 Ensure results card tests pass
    - Run ONLY the 6 tests written in 5.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6 tests from 5.1 pass
- MatchBadge shows percentage with correct color coding
- OccupationCard displays reasoning, warnings, state summary, invitation data, and agent CTA
- EmployerCard has matching confidence badge and reasoning treatment
- StateNominationMatrix is collapsible (collapsed by default)
- Weak match banner appears at <= 60% confidence
- Agent booking CTA appears for weak matches and non-ACS authorities

---

### Frontend -- Admin Panel

#### Task Group 6: Agent Knowledge Admin UI
**Dependencies:** Task Groups 1, 3 (needs database table and admin API routes)

- [x] 6.0 Complete agent knowledge admin panel
  - [x] 6.1 Write 4 focused tests for admin UI
    - Test that unauthenticated users are redirected to login
    - Test that authenticated non-admin users see "Access Denied" message
    - Test that admin user sees the occupation list with search/filter functionality
    - Test that edit form renders all 5 text fields and saves successfully
  - [x] 6.2 Create admin layout and auth guard
    - Create route at `src/app/admin/knowledge/page.tsx`
    - Protect with Supabase auth check (redirect to `/auth` if unauthenticated)
    - Check admin role via `isAdmin()` helper (show "Access Denied" card if not admin)
    - Use existing app layout patterns
  - [x] 6.3 Build occupation list view
    - List all occupations with title, ANZSCO code, and indicator showing which ones have knowledge entries
    - Add search/filter input (filter by title or ANZSCO code, client-side filtering)
    - Use existing shadcn/ui components: `Input` for search, `Card` for list items
    - Click an occupation to navigate to edit view
    - File: `src/app/admin/knowledge/page.tsx`
  - [x] 6.4 Build knowledge edit form
    - Route: `src/app/admin/knowledge/[anzsco_code]/page.tsx`
    - Display occupation title and ANZSCO code at the top
    - 5 textarea fields: Strategic Advice, Common Pitfalls, Recommended Approach, Tips and Hacks, Custom Notes
    - Explicit "Save" button (using shadcn/ui `Button`)
    - Use shadcn/ui `Textarea`, `Card`, `Button` components
    - Call `PUT /api/admin/knowledge/[anzsco_code]` on save
    - Show success/error toast feedback
    - Back navigation to list view
  - [x] 6.5 Ensure admin UI tests pass
    - Run ONLY the 4 tests written in 6.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4 tests from 6.1 pass
- Unauthenticated users redirected to login
- Non-admin authenticated users see "Access Denied"
- Admin can search/filter occupations, click to edit
- Edit form saves all 5 knowledge fields via API
- Uses existing shadcn/ui components and dark theme styling

---

### Testing

#### Task Group 7: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-6

- [x] 7.0 Review existing tests and fill critical gaps only
  - [x] 7.1 Review tests from Task Groups 1-6
    - Review the 4 tests from Task Group 1 (database layer)
    - Review the 6 tests from Task Group 2 (matching pipeline)
    - Review the 4 tests from Task Group 3 (API layer)
    - Review the 3 tests from Task Group 4 (stepper)
    - Review the 6 tests from Task Group 5 (results cards)
    - Review the 4 tests from Task Group 6 (admin UI)
    - Total existing tests: 27 tests
  - [x] 7.2 Analyze test coverage gaps for THIS feature only
    - Identify critical end-to-end user workflows that lack coverage
    - Focus on: full stepper -> matching -> results display flow
    - Focus on: admin knowledge entry -> AI prompt inclusion -> results display
    - Do NOT assess entire application test coverage
  - [x] 7.3 Write up to 10 additional strategic tests maximum
    - Integration test: full matching pipeline from user input through pre-filter, AI call, enrichment, to final response shape
    - Integration test: agent knowledge entries appear in the AI prompt when present for matched occupations
    - Integration test: invitation round data is correctly fetched and included in match response
    - E2E test: weak match (confidence <= 60) triggers both warning banner and agent booking CTA on the card
    - E2E test: non-ACS assessing authority triggers agent booking CTA regardless of confidence
    - E2E test: state invitation summary correctly condenses to "NSW, VIC + N more" format
    - Add other gap-filling tests as identified in 7.2 (up to 10 total)
  - [x] 7.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature (tests from 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, and 7.3)
    - Expected total: approximately 27-37 tests
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 27-37 tests total)
- Critical user workflows covered: stepper -> matching -> results display
- Agent knowledge -> AI pipeline -> card display workflow covered
- No more than 10 additional tests added in gap analysis
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Database Layer** -- no dependencies, foundation for everything
2. **Task Group 4: Stepper Updates** -- no dependencies on other groups, can run in parallel with Group 1
3. **Task Group 2: Type System & Matching Pipeline** -- depends on Group 1 (needs new DB columns/types)
4. **Task Group 3: API Route Enhancements** -- depends on Groups 1 and 2
5. **Task Group 5: Results Cards** -- depends on Groups 2 and 3 (needs new types and API response)
6. **Task Group 6: Admin Panel** -- depends on Groups 1 and 3 (needs DB table and API routes)
7. **Task Group 7: Test Review & Gap Analysis** -- depends on all groups

**Parallelization opportunities:**
- Groups 1 and 4 can run in parallel (no shared dependencies)
- Groups 5 and 6 can run in parallel (different UI concerns, both depend on Groups 1-3)

## Key Files Reference

### Files to Create
- `supabase/migrations/20260323000001_add_agent_knowledge.sql`
- `supabase/migrations/20260323000002_add_occupation_enrichment_columns.sql`
- `supabase/migrations/20260323000003_add_agent_knowledge_rls.sql`
- `supabase/seed-occupation-enrichment.sql`
- `src/app/api/admin/knowledge/route.ts`
- `src/app/api/admin/knowledge/[anzsco_code]/route.ts`
- `src/app/admin/knowledge/page.tsx`
- `src/app/admin/knowledge/[anzsco_code]/page.tsx`

### Files to Modify
- `src/types/assessment.ts` -- update MatchResult, Occupation interfaces
- `src/types/database.ts` -- add AgentKnowledge, update Occupation, update Database type map
- `src/lib/occupation-matching.ts` -- pre-filtering, enhanced prompt, new tool schema, remove MatchLevel
- `src/app/api/match-occupations/route.ts` -- expanded queries, enrichment, new response shape
- `src/lib/auth-helpers.ts` -- add isAdmin() utility
- `src/lib/state-nominations.ts` -- add state invitation summary utility
- `src/components/results/MatchBadge.tsx` -- confidence percentage display
- `src/components/results/OccupationCard.tsx` -- reasoning, warnings, state summary, invitation data, agent CTA
- `src/components/results/EmployerCard.tsx` -- confidence badge, reasoning, agent CTA
- `src/components/stepper/StepperFlow.tsx` -- Page 5 validation, remove skippable
- `src/components/stepper/StepperPage5.tsx` -- mandatory duties, char counter, updated text
- `src/app/results/page.tsx` -- pass new props to cards

# Task Breakdown: Imminash Beta V1 -- AI-Powered Migration Intelligence Platform

## Overview
Total Task Groups: 14
Estimated Total Sub-tasks: ~130

This is a greenfield Next.js 15 application with two integrated phases: Phase 1 (free lead-gen assessment funnel) and Phase 2 (paid conversational document workspace). The implementation spans project setup, database schema + seed data, a 7-page stepper flow, rule-based points calculator, AI occupation matching, lead capture, full results dashboard, auth integration, conversational document workspace, AI chat streaming, document generation/download, and admin data management.

## Key References
- **Legacy code to port:** `pointsCalculator.ts`, `stateNominationData.ts`, `occupationData.ts`, `match-occupations` Supabase function, stepper/analyzing/teaser/email gate/results UX patterns
- **Spec:** `/Users/adityadeshpande/Orgs/Imminash/Imminash-beta/.agent-os/specs/2026-03-18-imminash-beta-v1/spec.md`
- **Seed data CSVs:** `occupations.csv`, state CSVs (act.csv, nsw.csv, qld.csv, sa.csv, tas.csv, wa.csv), `rounds.csv`

---

## Task List

### Project Foundation

#### Task Group 1: Project Setup and Configuration
**Dependencies:** None

- [ ] 1.0 Complete project initialization and configuration
  - [ ] 1.1 Initialize Next.js 15 with App Router, React 19, TypeScript strict mode
    - `npx create-next-app@latest` with App Router enabled, TypeScript strict, Tailwind CSS
    - Verify `tsconfig.json` has `"strict": true`
    - Configure path alias `@/` mapping to project root
  - [ ] 1.2 Install and configure shadcn/ui
    - Run `npx shadcn@latest init`
    - Install base components: Button, Input, Select, Tabs, Dialog, Card, Badge, Tooltip, Progress
    - Verify components appear in `components/ui/`
  - [ ] 1.3 Install and configure Supabase client
    - Install `@supabase/supabase-js` and `@supabase/ssr`
    - Create `lib/supabase/client.ts` (browser client)
    - Create `lib/supabase/server.ts` (server client for API routes)
    - Create `lib/supabase/middleware.ts` (auth session refresh)
    - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
  - [ ] 1.4 Install and configure Anthropic SDK
    - Install `@anthropic-ai/sdk`
    - Create `lib/anthropic.ts` with client initialization
    - Add `ANTHROPIC_API_KEY` and `AI_MODEL` (default: `claude-sonnet-4-6`) to `.env.local`
  - [ ] 1.5 Install additional dependencies
    - `zod` for request validation
    - `@react-pdf/renderer` for PDF generation
    - `docx` for DOCX generation
    - `jszip` for ZIP bundling
    - `papaparse` for CSV parsing (seed scripts)
  - [ ] 1.6 Establish folder structure
    - `app/` for routes (App Router)
    - `components/ui/` for shadcn/reusable primitives
    - `components/stepper/` for stepper flow sections
    - `components/results/` for results dashboard sections
    - `components/workspace/` for Phase 2 document workspace sections
    - `components/landing/` for hero/landing page sections
    - `lib/` for business logic (points calculator, state nominations, occupation matching, etc.)
    - `types/` for shared TypeScript interfaces
  - [ ] 1.7 Create `.env.example` with all required environment variables
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
    - `ANTHROPIC_API_KEY`, `AI_MODEL`
    - `ADMIN_SECRET` (for admin data upload endpoint)
  - [ ] 1.8 Configure Vercel deployment
    - Create `vercel.json` if custom config needed
    - Verify build succeeds with `npm run build`

**Acceptance Criteria:**
- `npm run dev` starts the application without errors
- `npm run build` succeeds with no TypeScript errors
- Supabase client connects to the database
- Folder structure matches the spec's requirements
- All environment variables documented in `.env.example`

---

### Database Layer

#### Task Group 2: Database Schema, Migrations, and Seed Data
**Dependencies:** Task Group 1

- [ ] 2.0 Complete database schema and seed data
  - [ ] 2.1 Write 6 focused tests for database schema and seed data
    - Test occupations table accepts a valid row with all required fields (anzsco_code, title, skill_level, assessing_authority, list booleans, min_189_points)
    - Test leads table insert with email, first_name, visa_status, job_title
    - Test assessments table accepts a row with null user_id (anonymous user) and jsonb fields
    - Test state_nominations table accepts rows with state, anzsco_code, visa_190, visa_491 fields
    - Test foreign key constraint: assessments.lead_id references leads.id
    - Test occupation seed count matches legacy CSV row count (~575 occupations) [AC-DB1]
  - [ ] 2.2 Create `leads` table migration
    - Fields: `id` (uuid, PK, default gen_random_uuid()), `email` (text, not null), `first_name` (text), `visa_status` (text), `job_title` (text), `created_at` (timestamptz, default now())
    - Add index on `email`
  - [ ] 2.3 Create `profiles` table migration
    - Fields: `id` (uuid, PK, references auth.users), `email` (text, not null), `first_name` (text), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add index on `email`
  - [ ] 2.4 Create `occupations` table migration
    - Fields: `id` (uuid, PK), `anzsco_code` (text, not null), `title` (text, not null), `skill_level` (integer), `assessing_authority` (text), `mltssl` (boolean, default false), `stsol` (boolean, default false), `csol` (boolean, default false), `rol` (boolean, default false), `min_189_points` (integer, nullable), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add unique index on `anzsco_code`
    - Add index on `title`
    - Add index on `assessing_authority`
  - [ ] 2.5 Create `state_nominations` table migration
    - Fields: `id` (uuid, PK), `state` (text, not null), `anzsco_code` (text, not null), `occupation_title` (text), `visa_190` (text), `visa_491` (text), `notes` (text, nullable), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add composite index on `(state, anzsco_code)`
    - Add index on `anzsco_code`
  - [ ] 2.6 Create `invitation_rounds` table migration
    - Fields: `id` (uuid, PK), `round_date` (date), `visa_subclass` (text), `anzsco_code` (text), `minimum_points` (integer), `invitations_issued` (integer, nullable), `created_at` (timestamptz, default now())
    - Add index on `anzsco_code`
  - [ ] 2.7 Create `assessments` table migration
    - Fields: `id` (uuid, PK), `user_id` (uuid, nullable, references auth.users), `lead_id` (uuid, nullable, references leads.id), `profile_data` (jsonb, not null), `points_breakdown` (jsonb, not null), `total_points` (integer, not null), `matched_occupations` (jsonb, not null), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add index on `user_id`
    - Add index on `lead_id`
    - Nullable `user_id` allows anonymous users; linked after auth [AC-AU2]
  - [ ] 2.8 Create `assessing_body_requirements` table migration
    - Fields: `id` (uuid, PK), `body_name` (text, not null, unique), `required_documents` (jsonb), `duty_descriptors` (jsonb), `qualification_requirements` (jsonb), `experience_requirements` (jsonb), `formatting_notes` (text), `conversation_template` (jsonb), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add unique index on `body_name`
  - [ ] 2.9 Create `documents` table migration
    - Fields: `id` (uuid, PK), `assessment_id` (uuid, references assessments.id), `user_id` (uuid, references auth.users), `document_type` (text, not null), `title` (text), `content` (jsonb), `storage_path` (text, nullable), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add index on `(assessment_id, document_type)`
    - Add index on `user_id`
  - [ ] 2.10 Create `conversations` table migration
    - Fields: `id` (uuid, PK), `assessment_id` (uuid, references assessments.id), `user_id` (uuid, references auth.users), `messages` (jsonb, default '[]'), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())
    - Add index on `(assessment_id, user_id)`
  - [ ] 2.11 Create seed script for occupations table from `occupations.csv`
    - Parse CSV with papaparse
    - Map columns to table fields: anzsco_code, title, skill_level, assessing_authority, mltssl, stsol, csol, rol, min_189_points
    - Upsert on anzsco_code to avoid duplicates
    - Verify row count matches legacy (~575 occupations) [AC-DB1]
  - [ ] 2.12 Create seed script for state_nominations from state CSV files
    - Parse each state CSV (act.csv, nsw.csv, qld.csv, sa.csv, tas.csv, wa.csv)
    - Map to state_nominations table with state, anzsco_code, occupation_title, visa_190, visa_491
    - Hardcode VIC rules: eligible if occupation is on MLTSSL or STSOL [SN-2]
    - Hardcode NT rules: both visas closed for all occupations [SN-3]
    - Verify every MLTSSL occupation has state nomination records for all 8 states [AC-DB2]
  - [ ] 2.13 Create seed script for invitation_rounds from `rounds.csv`
    - Parse CSV and insert into invitation_rounds table
    - Verify all rows loaded [AC-DB3]
  - [ ] 2.14 Populate assessing_body_requirements for the Big 4
    - ACS: required documents (Employment Reference, CV, Statutory Declaration, RPL report for major/minor), duty descriptors (ICT-specific), qualification/experience requirements, conversation template guiding ICT specialization questions [AC-DB4]
    - VETASSESS: required documents (Employment Reference, CV, Cover Letter), duty descriptors (ANZSCO unit group aligned), qualification/experience requirements, conversation template [AC-DB4]
    - Engineers Australia: required documents (CDR with Career Episodes, Summary Statement, CV), duty descriptors (engineering competency elements), requirements, conversation template [AC-DB4]
    - TRA: required documents (Employment Reference, Trade qualification evidence, CV), duty descriptors (trade-specific), requirements, conversation template [AC-DB4]
    - Each entry must have non-empty required_documents, duty_descriptors, and conversation_template [AC-DB4]
  - [ ] 2.15 Ensure database layer tests pass
    - Run ONLY the 6 tests written in 2.1
    - Verify all migrations run successfully
    - Verify seed data loads correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All 9 tables exist with correct columns, types, indexes, and foreign keys
- Occupations table has ~575 rows matching legacy CSV [AC-DB1]
- Every MLTSSL occupation has state nomination records for all 8 states [AC-DB2]
- invitation_rounds table has all rows from rounds.csv [AC-DB3]
- assessing_body_requirements has entries for ACS, VETASSESS, Engineers Australia, TRA with non-empty required_documents, duty_descriptors, and conversation_template [AC-DB4]
- The 6 tests from 2.1 pass

---

### Core Business Logic

#### Task Group 3: Points Calculator Engine
**Dependencies:** Task Group 1 (TypeScript project must exist)

- [ ] 3.0 Complete points calculator with full test coverage
  - [ ] 3.1 Write 8 focused tests for the points calculator
    - Test PC-1: Maximum points profile returns Total=120 (Age=30, English=20, AU Exp=20, Offshore=0, Education=20, AU Study=5, Regional=5, NAATI=5, PY=5, Partner=10)
    - Test PC-2: Combined experience cap with AU=8+ and Offshore=5-8 returns AU=20, Offshore=0, Combined=20
    - Test PC-3: Combined experience cap partial fill with AU=1-3 (5pts) and Offshore=5-8 (15pts) returns Combined=20
    - Test PC-4: Combined experience under cap with AU=1-3 (5pts) and Offshore=1-3 (5pts) returns Combined=10
    - Test PC-5: Minimum viable 189 profile returns Total=70 (above 65 threshold)
    - Test PC-6: Below 189 threshold returns Total=30
    - Test PC-7: Partner status combinations (Single=10, Skilled=10, English only=5, Neither=0)
    - Test PC-8: Age boundary values (17=0, 18=25, 25=30, 33=25, 40=15, 45=0)
  - [ ] 3.2 Create `types/assessment.ts` with shared TypeScript interfaces
    - `PointsBreakdown` interface: per-category points, max values, total
    - `UserProfile` interface: all stepper form fields
    - `MatchResult` interface: occupation title, anzsco_code, match_level, metadata
    - `Occupation` interface: matching the occupations table schema
    - `StepperFormData` interface: all fields from the 7-page stepper
  - [ ] 3.3 Port `estimatePoints()` to `lib/points-calculator.ts`
    - 10 categories with exact legacy point values:
      - Age: 18-24=25, 25-32=30, 33-39=25, 40-44=15, else=0 (max 30) [PC-8]
      - English: Superior=20, Proficient=10, Competent=0 (max 20) [PC-9 implicitly]
      - AU Experience: None=0, 0-1=0, 1-3=5, 3-5=10, 5-8=15, 8+=20 (max 20)
      - Offshore Experience: same scale up to max 15
      - Education: PhD=20, Masters=15, Bachelor=15, Diploma=10, Trade=10 (max 20) [PC-9]
      - Australian Study: Yes=5, No=0 (max 5)
      - Regional Study: Yes=5, No=0 (max 5)
      - NAATI/CCL: Yes=5, No=0 (max 5)
      - Professional Year: Yes=5, No=0 (max 5)
      - Partner: Single=10, Skilled=10, English=5, Neither=0 (max 10) [PC-7]
    - Combined experience cap: AU + Offshore max 20, AU prioritized, offshore fills remainder [PC-2, PC-3, PC-4]
    - Return `PointsBreakdown` with per-category points, max values, and total
    - Max possible score: 125, minimum for 189: 65
  - [ ] 3.4 Port `calcPointsSoFar()` lightweight variant for live stepper counter
    - Accepts partial data (undefined fields treated as 0 points)
    - No async operations, no database calls
    - Must not throw on missing fields [PC-10]
  - [ ] 3.5 Port `parseExperienceYears()` helper for employer sponsored eligibility checks
    - Convert experience dropdown values ("None", "0-1", "1-3", etc.) to numeric years
    - Used by employer sponsored tab for 186/482 eligibility
  - [ ] 3.6 Derive `partnerStatus` from relationshipStatus + partnerSkills combination
    - Single -> partnerStatus = "single" (10pts)
    - Have partner + Skilled -> partnerStatus = "skilled" (10pts)
    - Have partner + English only -> partnerStatus = "english" (5pts)
    - Have partner + Neither -> partnerStatus = "neither" (0pts)
  - [ ] 3.7 Ensure points calculator tests pass
    - Run ONLY the 8 tests written in 3.1
    - All test cases PC-1 through PC-10 must pass
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- `estimatePoints()` returns correct totals for all test cases PC-1 through PC-10
- Combined experience cap logic works correctly [PC-2, PC-3, PC-4]
- `calcPointsSoFar()` handles partial data without errors [PC-10]
- Partner status derivation is correct [PC-7]
- All 8 tests from 3.1 pass

---

#### Task Group 4: State Nomination and Pathway Logic
**Dependencies:** Task Group 2 (database tables and seed data), Task Group 3 (types)

- [ ] 4.0 Complete state nomination eligibility and pathway logic
  - [ ] 4.1 Write 8 focused tests for state nominations, possibility rating, and employer eligibility
    - Test SN-1: NSW unit group matching (4-digit "2613" lookup), 491 always closed
    - Test SN-2: VIC list derivation (MLTSSL=eligible, CSOL only=not eligible)
    - Test SN-3: NT always closed for both visa types
    - Test SN-4: ACT rules (all eligible for 491; 190 eligible unless "(491 Only)")
    - Test SN-5: WA normalized title matching
    - Test PR-1 + PR-4: Possibility rating High (points>=threshold AND MLTSSL) and Low (neither)
    - Test ES-1 + ES-2: Visa 186 eligibility (MLTSSL + 3yrs = eligible; MLTSSL + 1-3yrs = not eligible)
    - Test ES-4 + ES-5: Visa 482 eligibility (CSOL + 1yr = eligible; CSOL + 0 = not eligible)
  - [ ] 4.2 Port `getStateEligibility()` to `lib/state-nominations.ts`
    - Adapt from client-side CSV fetching to server-side database queries against state_nominations table
    - NSW: 4-digit unit group matching for 190, 491 always closed [SN-1]
    - VIC: derived from list membership (MLTSSL or STSOL = eligible) [SN-2]
    - QLD: ANZSCO code set lookup
    - SA: ANZSCO code set, both visa types
    - WA: normalized title matching (case-insensitive) [SN-5]
    - TAS: ANZSCO code set
    - ACT: all eligible for 491; 190 eligible unless marked "(491 Only)" [SN-4]
    - NT: fully closed for all occupations [SN-3]
    - Return array of 8 state objects with state name, visa_190 status, visa_491 status
  - [ ] 4.3 Create possibility rating logic in `lib/pathway-signals.ts`
    - High: user points >= occupation min_189_points AND occupation on MLTSSL [PR-1]
    - Medium: meets threshold OR on MLTSSL (not both) [PR-2, PR-3]
    - Medium: on MLTSSL but min_189_points is null (no threshold data) [PR-5]
    - Low: neither condition met [PR-4]
  - [ ] 4.4 Port `getPathwaySignal()` for rule-based visa pathway statements
    - Generate human-readable statements about 189/190/491 eligibility
    - Based on list status (MLTSSL/STSOL/CSOL), points, and experience
  - [ ] 4.5 Port `getPrimaryList()` for determining MLTSSL/CSOL/STSOL/ROL from occupation booleans
  - [ ] 4.6 Create employer sponsored eligibility logic in `lib/employer-eligibility.ts`
    - Visa 186: requires MLTSSL + 3+ years AU experience [ES-1, ES-2, ES-3]
    - Visa 482: requires CSOL + 1+ year total experience [ES-4, ES-5]
    - Return structured object with 186 and 482 eligibility booleans and reasons
  - [ ] 4.7 Ensure state nomination and pathway tests pass
    - Run ONLY the 8 tests written in 4.1
    - All test cases SN-1 through SN-5, PR-1 through PR-5, ES-1 through ES-5 must be covered
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- State eligibility returns correct results for all 8 states [SN-1 through SN-5]
- Possibility rating matches all 5 test cases [PR-1 through PR-5]
- Employer sponsored eligibility matches all 5 test cases [ES-1 through ES-5]
- All 8 tests from 4.1 pass

---

#### Task Group 5: AI Occupation Matching
**Dependencies:** Task Group 2 (occupations table seeded), Task Group 3 (types)

- [ ] 5.0 Complete AI occupation matching with keyword fallback
  - [ ] 5.1 Write 5 focused tests for AI occupation matching
    - Test AI-1: Structured output validation -- API returns skillsMatches and employerMatches with valid occupation titles
    - Test AI-2: Canonical validation rejects hallucinated titles not in ANZSCO
    - Test AI-3: Fallback to keyword matching on simulated AI failure (returns results, not 500)
    - Test AI-4: Empty profile graceful handling (only fieldOfStudy provided, returns matches)
    - Test AI-5: Match level assignment (score >=4 = High, >=2 = Medium, <2 = Low)
  - [ ] 5.2 Create `POST /api/match-occupations` API route
    - Accept body: fieldOfStudy, jobTitle, jobDuties, additionalFieldOfStudy, additionalDegreeLevel, additionalDegreeCountry, plus full skills and employer occupation title arrays
    - Zod validation on request body; reject invalid input with 400
    - Graceful error handling: return empty arrays on failure, never block the user [AI-3]
  - [ ] 5.3 Implement AI matching via Anthropic SDK with tool use
    - System prompt: user profile fields + two occupation lists (skills list = MLTSSL/STSOL, employer list = CSOL)
    - Tool schema: `return_matched_occupations` with `skillsMatches` (top 5 strings) and `employerMatches` (top 3 strings)
    - Use `AI_MODEL` env var (defaults to `claude-sonnet-4-6`)
    - Send user profile context: field of study, job title, duties, additional qualifications
  - [ ] 5.4 Implement canonical validation of AI-returned titles
    - Query occupations table for all titles
    - Case-insensitive match each AI-returned title against canonical data
    - Filter out any titles not in the database (reject hallucinated titles) [AI-2]
    - Return top 3 skills matches + top 2 employer matches to frontend
  - [ ] 5.5 Port keyword fallback matching from legacy `matchOccupations()`
    - Bigram scoring algorithm from legacy code
    - Triggered if AI fails, times out, or returns insufficient results [AI-3]
    - Match level assignment: score >=4 = "High", >=2 = "Medium", <2 = "Low" [AI-5]
  - [ ] 5.6 Ensure AI matching tests pass
    - Run ONLY the 5 tests written in 5.1 (mock Anthropic API calls)
    - Verify canonical validation, fallback, and graceful degradation
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- AI matching returns structured output with valid occupation titles [AI-1]
- Hallucinated titles are filtered out [AI-2]
- Keyword fallback works when AI fails [AI-3]
- Empty profiles return matches without errors [AI-4]
- Match levels are correctly assigned [AI-5]
- All 5 tests from 5.1 pass

---

### Phase 1 Frontend: Assessment Funnel

#### Task Group 6: Landing Page and Stepper Flow UI
**Dependencies:** Task Group 1 (project setup, shadcn/ui), Task Group 3 (points calculator for live counter)

- [ ] 6.0 Complete landing page and 7-page stepper flow
  - [ ] 6.1 Write 7 focused tests for stepper flow behavior
    - Test AC-S1: Session persistence -- fill pages 1-4, simulate refresh, verify data restored from sessionStorage key `imminash_stepper`
    - Test AC-S2: Conditional page visibility -- select "Not yet" for skilled role, verify Page 5 is skipped and progress bar shows 6 pages
    - Test AC-S3: Conditional field visibility -- select "Overseas" for country of education, verify Australian study and Regional study fields are hidden
    - Test AC-S4: Field validation -- leave required fields empty, verify Continue button is disabled
    - Test AC-S5: Live points counter -- fill fields, verify counter matches `calcPointsSoFar()` output
    - Test AC-S6: Points popup -- change English from Competent to Proficient, verify "+10" popup appears
    - Test AC-S7: Dynamic labels -- select "I was in the past", verify job title label reads "Previous job title"
  - [ ] 6.2 Build Landing/Hero page at `app/page.tsx`
    - Value proposition headline communicating AI-powered migration intelligence
    - Trust signals: "Based on official ANZSCO data", "AI-powered matching", "2,400+ profiles analyzed"
    - Feature cards: occupation matching, points calculation, pathway mapping, document preparation
    - Single CTA button: "Check My Eligibility" navigating to `/assessment`
    - Mobile-first responsive layout using Tailwind
    - Components in `components/landing/`: `Hero.tsx`, `TrustSignals.tsx`, `FeatureCards.tsx`
  - [ ] 6.3 Create stepper flow page at `app/assessment/page.tsx`
    - Stepper container with page navigation, progress bar, and live points counter
    - Page config array pattern: define each page's fields, conditions, and validation rules
    - Session persistence via sessionStorage (key: `imminash_stepper`) -- save on every field change, restore on mount [AC-S1]
    - Segmented progress bar showing current page / total active pages (accounts for conditional page skipping) [AC-S2]
  - [ ] 6.4 Build Page 1 (Basics)
    - Fields: First name (text, required), Age (number, 15-65, required), Current visa status (dropdown: 500/485/482/Other, required), Visa expiry date (text, MM/YYYY format, required)
    - All fields required before advancing [AC-S4]
  - [ ] 6.5 Build Page 2 (Education)
    - Fields: Highest education level (dropdown: PhD/Masters/Bachelor/Diploma/Trade, required), Field of study (text, required), University name (text, optional), Country of education (pill: Australia/Overseas, required)
    - Conditional fields (only if country=Australia): Australian study 2+ years (pill), Regional study (pill) [AC-S3]
  - [ ] 6.6 Build Page 3 (Additional Qualifications, skippable)
    - Fields: Additional degree level (dropdown including "None"), Additional field of study (text, conditional on degree selected), Country of additional degree (pill, conditional)
    - Entire page is skippable
  - [ ] 6.7 Build Page 4 (Work Experience)
    - Fields: Working in skilled role (pill: "Yes, currently" / "I was in the past" / "Not yet", required)
    - Conditional fields (only if working/was working): Job title (text, label changes by work status [AC-S7]), Australian work experience years (dropdown: None/0-1/1-3/3-5/5-8/8+), Overseas experience years (dropdown)
    - "Not yet" selection triggers Page 5 skip [AC-S2]
  - [ ] 6.8 Build Page 5 (Role Details, conditional)
    - Only shown if user is/was working skilled
    - Free-text textarea for job duties and responsibilities
    - Skippable (no required fields)
  - [ ] 6.9 Build Page 6 (English & Languages)
    - Fields: English test score band (dropdown: Superior/Proficient/Competent/Not taken, required), NAATI/CCL credential (pill: Yes/No, required)
  - [ ] 6.10 Build Page 7 (Final Details)
    - Fields: Professional Year (pill: Yes/No, required), Relationship status (pill: Single/Have partner, required)
    - Conditional field (only if "Have partner"): Partner skills assessment (pill: Skilled/English only/Neither)
    - Derive `partnerStatus` from the combination of relationshipStatus + partnerSkills
  - [ ] 6.11 Implement live points counter in header
    - Visible from Page 2 onward
    - Calls `calcPointsSoFar()` with current form data on every field change [AC-S5]
    - Animates on change (number transition)
    - Points popup micro-celebrations (+5, +10, etc.) when points increase [AC-S6]
  - [ ] 6.12 Implement pill-style select component
    - Reusable `PillSelect` component in `components/ui/PillSelect.tsx`
    - Used for binary/ternary choices (Yes/No, Australia/Overseas, etc.)
    - Active state styling with Tailwind
  - [ ] 6.13 Implement field validation and Continue button logic
    - All required visible fields must be filled before advancing [AC-S4]
    - Continue button disabled until valid
    - Show inline validation errors for individual fields
  - [ ] 6.14 Ensure stepper flow tests pass
    - Run ONLY the 7 tests written in 6.1
    - Verify session persistence, conditional logic, validation, and live counter
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Landing page renders with CTA that navigates to stepper [E2E-1 step 1]
- All 7 stepper pages render with correct fields
- Session persistence works across page refresh [AC-S1]
- Conditional pages and fields show/hide correctly [AC-S2, AC-S3]
- Validation blocks advancement when fields are empty [AC-S4]
- Live points counter matches calculator output [AC-S5]
- Points popup appears on increase [AC-S6]
- Dynamic labels change based on selections [AC-S7]
- All 7 tests from 6.1 pass

---

#### Task Group 7: Analyzing Screen and Teaser Screen
**Dependencies:** Task Group 5 (AI matching API), Task Group 6 (stepper flow outputs form data)

- [ ] 7.0 Complete analyzing screen and teaser screen
  - [ ] 7.1 Write 5 focused tests for analyzing and teaser screens
    - Test AC-AN1: Analyzing screen stays for at least 4.8 seconds even if AI responds faster
    - Test AC-AN2: Analyzing screen waits for AI if it takes longer than 4.8 seconds
    - Test AC-AN3: All 4 step messages appear sequentially (~1.2s each)
    - Test teaser screen displays animated points counter with correct color coding (green >=65, amber >=50, red <50)
    - Test teaser screen shows top 3 matched occupations with match level badges
  - [ ] 7.2 Build Analyzing Screen at `components/stepper/AnalyzingScreen.tsx`
    - Minimum 4.8 second animated progress with 4 sequential step messages [AC-AN1, AC-AN3]
    - Step messages: "Matching your profile to ANZSCO occupations...", "Identifying your assessing authority...", "Estimating your points score...", "Building your skills assessment roadmap..."
    - Progress ring SVG animation (circular, filling as steps complete)
    - Shimmer skeleton preview below the steps
    - Use refs to coordinate: `resultsReady` and `analyzingDone` flags [AC-AN2]
    - Advance ONLY when both flags are true
    - Fire AI matching API call on mount, set `resultsReady` when response arrives
    - Set `analyzingDone` after 4.8s timer completes
  - [ ] 7.3 Build Teaser Screen at `components/stepper/TeaserScreen.tsx`
    - Animated points counter/ring showing estimated total points out of 125
    - Color-coded by threshold: green (>=65), amber (>=50), red (<50)
    - Top 3 matched occupations listed with match level badges (High/Medium/Low)
    - Blurred preview of full report content below (CSS: opacity + blur + pointer-events-none)
    - "Unlock Full Report" CTA button overlaid on the blurred section
  - [ ] 7.4 Wire stepper completion to analyzing screen
    - On stepper Page 7 submit: transition to analyzing screen
    - Pass all form data to analyzing screen
    - Analyzing screen calls `POST /api/match-occupations` and `estimatePoints()` concurrently
    - Store results in component state for passing to teaser
  - [ ] 7.5 Ensure analyzing and teaser tests pass
    - Run ONLY the 5 tests written in 7.1
    - Mock the AI API for timing tests
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Analyzing screen shows for at least 4.8s [AC-AN1]
- Analyzing screen waits for slow AI responses [AC-AN2]
- 4 step messages appear sequentially [AC-AN3]
- Teaser screen shows animated points with correct color coding
- Teaser shows top 3 occupations with match badges
- Blurred preview with "Unlock Full Report" CTA renders correctly
- All 5 tests from 7.1 pass

---

#### Task Group 8: Email Gate, Assessment Persistence, and Full Results Dashboard
**Dependencies:** Task Group 4 (state nominations, pathway signals, employer eligibility), Task Group 7 (teaser screen passes data forward)

- [ ] 8.0 Complete email gate, assessment persistence, and full results dashboard
  - [ ] 8.1 Write 8 focused tests for email gate, assessment API, and results dashboard
    - Test AC-EG1: Invalid email disables submit button
    - Test AC-EG2: Valid email submission saves lead to database (email, first_name, visa_status, job_title)
    - Test assessment API: POST /api/assessments saves profile_data, points_breakdown, total_points, matched_occupations
    - Test AC-FR1: Occupation card renders ANZSCO code, title, match level, list status, assessing body, min 189 points
    - Test AC-FR2: Points gap calculation -- user 80pts, occupation threshold 85 -> shows "5 points below threshold"
    - Test AC-FR3: State nomination matrix renders all 8 states x 2 visa types, NT shows "closed"
    - Test AC-FR4: Employer tab shows correct 186/482 eligibility per rules
    - Test AC-FR5: Tab switching hides/shows correct content
  - [ ] 8.2 Build Email Gate at `components/stepper/EmailGate.tsx`
    - Email input with regex validation, centered layout [AC-EG1]
    - What-you-unlock checklist: "Detailed points breakdown", "Assessment stream & document checklist", "PR & employer sponsored visa pathways"
    - Social proof: "Join 2,400+ others preparing their skills assessment"
    - Submit button disabled until valid email [AC-EG1]
  - [ ] 8.3 Create `POST /api/leads` API route
    - Accept email, first_name, visa_status, job_title
    - Zod validation on request body
    - Insert into leads table [AC-EG2]
    - Return lead_id for linking to assessment
  - [ ] 8.4 Create `POST /api/assessments` API route
    - Accept profile_data (jsonb), points_breakdown (jsonb), total_points (int), matched_occupations (jsonb)
    - Optional user_id (null for anonymous), optional lead_id
    - Zod validation on request body
    - Insert into assessments table
    - Return assessment_id
  - [ ] 8.5 Wire email gate submission flow
    - On email submit: POST to `/api/leads`, then POST to `/api/assessments` with all Phase 1 results
    - Store assessment_id for Phase 2 linking
    - Advance to Full Results Dashboard [AC-EG3]
  - [ ] 8.6 Build Full Results Dashboard at `app/results/page.tsx`
    - Two-tab layout using shadcn Tabs component [AC-FR5]
    - Receive assessment data from email gate flow (or load from assessments table if returning)
  - [ ] 8.7 Build Tab 1: Skills Assessment
    - For each of top 3 matched occupations, render an `OccupationCard` component [AC-FR1]:
      - Occupation title + ANZSCO code
      - Match level badge (High=green, Medium=amber, Low=red)
      - Points gap indicator (above/below 189 threshold with trend icon) [AC-FR2]
      - 4-stat grid: List Status (with tooltip explanation), 189 Min Points, Possibility rating, State Nomination count
      - Skill Assessing Body name
      - Pathway Signals (rule-based statements from `getPathwaySignal()`)
      - State Nomination Matrix: 8 states x 2 visas with eligible/not eligible/closed status [AC-FR3]
    - Components in `components/results/`: `OccupationCard.tsx`, `StatGrid.tsx`, `StateNominationMatrix.tsx`, `PathwaySignals.tsx`, `MatchBadge.tsx`, `PointsGap.tsx`
  - [ ] 8.8 Build Tab 2: Employer Sponsored
    - Top 2 employer-matched occupations [AC-FR4]
    - Visa 186 eligibility card: eligible if MLTSSL + 3yrs AU experience [ES-1]
    - Visa 482 eligibility card: eligible if CSOL + 1yr total experience [ES-4]
    - Show eligibility status with reason text
    - Empty state message if no employer-sponsored pathways identified [AC-FR4]
  - [ ] 8.9 Add sticky CTA at bottom of results dashboard
    - "Start Document Preparation" button linking to Phase 2 auth flow
    - Fixed/sticky positioning at bottom of viewport
  - [ ] 8.10 Port `assessingAuthorityInfo` map for cost/timeline display
    - Used on occupation cards to show assessing body details
  - [ ] 8.11 Ensure email gate, assessment, and results tests pass
    - Run ONLY the 8 tests written in 8.1
    - Verify lead saving, assessment persistence, and dashboard rendering
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Email validation prevents invalid emails [AC-EG1]
- Lead saved to database on submit [AC-EG2]
- Assessment data persisted with all fields [AC-EG2]
- Advances to results after email submit [AC-EG3]
- Occupation cards display all required data [AC-FR1]
- Points gap shows correctly [AC-FR2]
- State nomination matrix shows all 8 states x 2 visas [AC-FR3]
- Employer tab shows correct eligibility [AC-FR4]
- Tab switching works [AC-FR5]
- All 8 tests from 8.1 pass

---

### Phase 2: Authentication and Document Workspace

#### Task Group 9: Supabase Auth Integration (Magic Link)
**Dependencies:** Task Group 2 (profiles table), Task Group 8 (email gate provides email, assessments table exists)

- [ ] 9.0 Complete magic link authentication flow
  - [ ] 9.1 Write 4 focused tests for auth flow
    - Test AC-AU1: Clicking "Start Document Preparation" shows auth modal with email pre-filled from gate
    - Test AC-AU2: After auth, anonymous assessment record is updated with user_id
    - Test AC-AU3: After first auth, profiles table contains entry linked to auth.users
    - Test AC-AU4: Already-authenticated user skips auth and goes directly to workspace
  - [ ] 9.2 Configure Supabase Auth for magic link
    - Enable magic link provider in Supabase dashboard
    - Configure redirect URL to `/auth/callback`
    - Create `app/auth/callback/route.ts` to handle auth code exchange
  - [ ] 9.3 Build auth modal component at `components/auth/AuthModal.tsx`
    - Email input pre-filled from email gate submission [AC-AU1]
    - "Send Magic Link" button
    - Loading state while email sends
    - Confirmation message: "Check your email for a login link"
    - Triggered when user clicks "Start Document Preparation" from results page [AC-AU1]
  - [ ] 9.4 Implement post-auth assessment linking
    - On successful auth callback: query assessments table for the anonymous assessment (matched by lead_id or session)
    - Update `assessments.user_id` to the newly authenticated user's ID [AC-AU2]
  - [ ] 9.5 Implement profile creation on first auth
    - On successful auth: check if profiles entry exists for user
    - If not, create profiles entry with user_id, email, first_name from lead data [AC-AU3]
    - If exists, update last login metadata
  - [ ] 9.6 Implement return user detection
    - On "Start Document Preparation" click: check if user is already authenticated via Supabase session
    - If authenticated: skip auth modal, redirect directly to workspace [AC-AU4]
    - If not: show auth modal
  - [ ] 9.7 Create Next.js middleware for protected routes
    - `middleware.ts` at project root
    - Protect `/workspace/*` routes -- redirect to results page if not authenticated
    - Refresh Supabase auth session on every request
  - [ ] 9.8 Ensure auth tests pass
    - Run ONLY the 4 tests written in 9.1
    - Mock Supabase Auth for unit tests
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Magic link auth triggers from "Start Document Preparation" with pre-filled email [AC-AU1]
- Anonymous assessment linked to user after auth [AC-AU2]
- Profile created in profiles table on first auth [AC-AU3]
- Return users skip auth and go directly to workspace [AC-AU4]
- Protected routes redirect unauthenticated users
- All 4 tests from 9.1 pass

---

#### Task Group 10: Conversational Document Workspace UI
**Dependencies:** Task Group 9 (auth required for workspace access), Task Group 2 (documents, conversations tables)

- [ ] 10.0 Complete document workspace split-panel UI
  - [ ] 10.1 Write 6 focused tests for workspace UI
    - Test AC-DW1: AI first message references user's matched occupation and assessing body
    - Test AC-DW2: Right panel shows tabs for all required document types based on assessing body
    - Test AC-DW5: Right panel documents are view-only (no contentEditable, no text input)
    - Test AC-DW6: On viewport < 768px, panels stack vertically with toggle button
    - Test AC-DW7: Returning user sees previous chat messages restored from database
    - Test AC-DW8: Different assessing bodies produce different first messages (ACS asks ICT-specific questions, VETASSESS asks ANZSCO duties)
  - [ ] 10.2 Build workspace layout at `app/workspace/page.tsx`
    - Split-panel layout: left panel for AI chat, right panel for document preview
    - Desktop: side-by-side with adjustable divider
    - Mobile (< 768px): stack vertically with toggle button to switch between chat and documents [AC-DW6]
  - [ ] 10.3 Build chat panel component at `components/workspace/ChatPanel.tsx`
    - Chat message interface with AI and user messages (speech bubbles)
    - Text input at bottom with send button
    - Auto-scroll to latest message
    - Streaming text display (character-by-character as AI responds)
    - Loading indicator while AI is generating
  - [ ] 10.4 Build document preview panel at `components/workspace/DocumentPanel.tsx`
    - Tabbed document viewer using shadcn Tabs [AC-DW2]
    - Document types determined by assessing body's required_documents from assessing_body_requirements table
    - Tab labels: Employment Reference, CV/Resume, Cover Letter/Personal Statement, Statutory Declaration(s), Document Checklist, Submission Guide
    - Documents are VIEW-ONLY: no contentEditable, no text inputs, no click-to-edit [AC-DW5]
    - All edits must go through the chat
  - [ ] 10.5 Implement context pre-filling from Phase 1
    - Load assessment data: matched occupation, assessing body, job title, field of study, duties (if provided), points score
    - Pass context to AI chat system prompt [AC-DW1]
    - AI first message references this context and initiates assessing-body-specific conversation flow [AC-DW8]
  - [ ] 10.6 Implement document change highlighting
    - When AI updates a document section, visually highlight changed text [AC-DW4]
    - Use background color animation (e.g., yellow highlight that fades)
    - Track which sections changed between updates
  - [ ] 10.7 Implement conversation persistence
    - Save conversation messages to conversations table after each exchange
    - On workspace load: fetch existing conversation for this assessment [AC-DW7]
    - Restore chat history and document state
  - [ ] 10.8 Implement mobile toggle behavior
    - Toggle button switches between chat view and document view [AC-DW6]
    - Both views are fully usable on mobile
    - Default to chat view on mobile
  - [ ] 10.9 Ensure workspace UI tests pass
    - Run ONLY the 6 tests written in 10.1
    - Mock API responses for conversation loading
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Split-panel layout renders correctly on desktop and mobile [AC-DW6]
- AI first message references Phase 1 data [AC-DW1]
- Document tabs match assessing body requirements [AC-DW2]
- Documents are view-only [AC-DW5]
- Change highlighting works [AC-DW4]
- Conversation persists across sessions [AC-DW7]
- Body-specific conversation flow varies by assessing body [AC-DW8]
- All 6 tests from 10.1 pass

---

#### Task Group 11: AI Chat API and Duty Alignment Engine
**Dependencies:** Task Group 5 (Anthropic SDK configured), Task Group 10 (workspace UI to consume streaming responses)

- [ ] 11.0 Complete AI chat streaming API and duty alignment
  - [ ] 11.1 Write 5 focused tests for chat API and duty alignment
    - Test chat API accepts messages array and returns streaming response
    - Test system prompt includes assessing body requirements, ANZSCO duty descriptors, and user documents
    - Test document update markers are correctly parsed from AI response
    - Test AC-DW3: Employment details in chat trigger Employment Reference document update
    - Test duty alignment: user plain-language duties are rewritten to align with ANZSCO task descriptors
  - [ ] 11.2 Create `POST /api/chat` streaming endpoint
    - Accept: messages array, assessment_id, conversation context (profile data, matched occupation, assessing body requirements, current documents)
    - Validate authenticated user owns the assessment
    - Return streaming response using Anthropic SDK streaming
  - [ ] 11.3 Build system prompt construction in `lib/chat-prompt.ts`
    - Include assessing body requirements profile (from assessing_body_requirements table)
    - Include target occupation's ANZSCO duty descriptors
    - Include user's existing document content (so AI can reference and update)
    - Include formatting requirements specific to the assessing body
    - Include conversation template from assessing body to guide the flow [AC-DW8]
  - [ ] 11.4 Implement document update markers in AI responses
    - Define structured marker format (e.g., `[DOC_UPDATE:document_type]...[/DOC_UPDATE]`)
    - AI response includes markers indicating which document to update and what content to set [AC-DW3]
    - Parse markers on the frontend to extract document updates
    - Apply updates to the corresponding document tab in real-time
  - [ ] 11.5 Implement duty alignment engine in `lib/duty-alignment.ts`
    - User describes duties in plain language through chat
    - AI rewrites duties to align with ANZSCO task descriptors for the matched occupation
    - Alignment considers the specific expectations of the assessing body (from assessing_body_requirements)
    - Updated duties reflected in Employment Reference and CV documents in real-time [AC-DW3]
  - [ ] 11.6 Save document updates to database
    - When AI generates/updates a document, upsert the documents table row
    - Store document content as jsonb (structured sections)
    - Update conversation messages in conversations table
  - [ ] 11.7 Ensure chat API and duty alignment tests pass
    - Run ONLY the 5 tests written in 11.1
    - Mock Anthropic streaming for tests
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Chat API streams responses correctly
- System prompt includes all required context (assessing body, ANZSCO duties, documents)
- Document update markers are parsed and applied to the right document tab [AC-DW3]
- Duty alignment rewrites user duties to match ANZSCO descriptors
- Documents update in real-time during conversation [AC-DW3]
- All 5 tests from 11.1 pass

---

#### Task Group 12: Document Generation and Download
**Dependencies:** Task Group 10 (documents exist in database), Task Group 11 (AI generates document content)

- [ ] 12.0 Complete document generation and download system
  - [ ] 12.1 Write 4 focused tests for document download
    - Test AC-DD1: Single document PDF download returns valid PDF with content matching preview
    - Test AC-DD2: Single document DOCX download returns valid .docx file
    - Test AC-DD3: Download all returns ZIP containing PDF + DOCX for every document
    - Test AC-DD4: After download, storage_path in documents table is populated and file exists in Supabase Storage
  - [ ] 12.2 Create `GET /api/documents/[assessmentId]` API route
    - Retrieve all documents for an assessment from documents table
    - Validate authenticated user owns the assessment
    - Return array of document objects with type, title, content, storage_path
  - [ ] 12.3 Create `POST /api/documents/[documentId]/download` API route
    - Accept format parameter: "pdf" or "docx"
    - Generate the requested format from document content
    - Save generated file to Supabase Storage
    - Update documents.storage_path with the storage path [AC-DD4]
    - Return the file as a download response
  - [ ] 12.4 Implement PDF generation
    - Use `@react-pdf/renderer` for server-side PDF generation
    - Create PDF templates for each document type (Employment Reference, CV, Cover Letter, Statutory Declaration, etc.)
    - Formatted content matching the document preview [AC-DD1]
  - [ ] 12.5 Implement DOCX generation
    - Use `docx` npm package for DOCX generation
    - Create DOCX templates for each document type
    - Proper formatting: headings, paragraphs, lists, tables [AC-DD2]
  - [ ] 12.6 Create `POST /api/documents/[assessmentId]/download-all` API route
    - Generate PDF + DOCX for all documents in the assessment
    - Bundle into ZIP using `jszip` [AC-DD3]
    - Save all files to Supabase Storage
    - Return ZIP as download response
  - [ ] 12.7 Build download UI in workspace
    - "Download All" button in the workspace header/toolbar [AC-DD3]
    - Individual document download button (PDF/DOCX dropdown) per document tab [AC-DD1, AC-DD2]
    - Loading states during generation
    - Success notification after download
  - [ ] 12.8 Ensure document download tests pass
    - Run ONLY the 4 tests written in 12.1
    - Verify file generation produces valid outputs
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- Single document PDF downloads with correct formatting [AC-DD1]
- Single document DOCX downloads and opens in Word/Google Docs [AC-DD2]
- Download all produces ZIP with PDF + DOCX for every document [AC-DD3]
- Files saved to Supabase Storage with storage_path updated [AC-DD4]
- All 4 tests from 12.1 pass

---

### Admin and Data Management

#### Task Group 13: Admin Data Upload
**Dependencies:** Task Group 2 (database tables exist)

- [ ] 13.0 Complete admin data upload endpoint
  - [ ] 13.1 Write 3 focused tests for admin upload
    - Test AC-DM1: CSV upload upserts occupations (no duplicates, data reflects new file)
    - Test AC-DM2: CSV upload updates state nominations for a specific state
    - Test AC-DM3: Endpoint returns 401 without valid auth
  - [ ] 13.2 Create `POST /api/admin/upload-data` API route
    - Accept CSV file upload (multipart form data)
    - Accept `table` parameter: "occupations", "state_nominations", "invitation_rounds"
    - Accept `state` parameter (only for state_nominations, e.g., "nsw")
    - Simple authentication: check `ADMIN_SECRET` header or Supabase auth admin role check [AC-DM3]
    - Return 401 Unauthorized without valid auth
  - [ ] 13.3 Implement CSV parsing and upsert logic
    - Parse CSV with papaparse
    - For occupations: upsert on anzsco_code [AC-DM1]
    - For state_nominations: delete existing rows for the state, then insert new rows [AC-DM2]
    - For invitation_rounds: upsert on (round_date, visa_subclass, anzsco_code)
    - Return count of rows processed
  - [ ] 13.4 Ensure admin upload tests pass
    - Run ONLY the 3 tests written in 13.1
    - Verify auth, parsing, and upsert behavior
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- CSV upload updates occupations without duplicates [AC-DM1]
- CSV upload updates state nominations for specific state [AC-DM2]
- Endpoint requires authentication [AC-DM3]
- All 3 tests from 13.1 pass

---

### Integration Testing and Polish

#### Task Group 14: End-to-End Flow Verification and Gap Analysis
**Dependencies:** All previous task groups (TG1-TG13)

- [ ] 14.0 Review existing tests and verify end-to-end flows
  - [ ] 14.1 Review all tests from Task Groups 1-13
    - Review the approximately 69 tests written across TG1-TG13
    - Identify any critical user workflow gaps
    - Focus on: complete Phase 1 happy path, complete Phase 2 happy path, stepper minimum input path, AI failure graceful degradation
  - [ ] 14.2 Write up to 10 additional integration tests to fill critical gaps
    - Test E2E-1: Complete Phase 1 happy path -- hero CTA -> stepper (7 pages) -> analyzing (>= 4.8s) -> teaser (points + 3 occupations) -> email gate -> full results (skills tab with 3 cards + state matrix, employer tab)
    - Test E2E-2: Complete Phase 2 happy path -- results "Start Document Preparation" -> auth (magic link) -> workspace with AI greeting referencing occupation -> chat about employment -> Employment Reference updates -> download all ZIP -> return to see saved documents and chat
    - Test E2E-3: Stepper minimum input -- fill only required fields, skip optional pages -> flow completes, points correct with 0 for skipped categories, occupation matching still works
    - Test E2E-4: AI matching failure graceful degradation -- simulate AI failure -> keyword fallback runs -> user still sees results, no error screen
    - Test PC-9: Education level points (PhD=20, Masters=15, Bachelor=15, Diploma=10, Trade=10) -- verify if not already covered
    - Test PR-2 + PR-3 + PR-5: Remaining possibility rating edge cases (Medium for wrong list, Medium for low points, Medium for null threshold)
    - Test ES-3: Visa 186 ineligible due to wrong list (CSOL only)
    - Test SN remaining: QLD, SA, TAS code matching if not covered in TG4
    - Add other tests as identified in 14.1 (up to 10 total)
  - [ ] 14.3 Run all feature-specific tests
    - Run ALL tests from TG1-TG14 (approximately 69 + up to 10 = ~79 tests)
    - Verify no regressions across all task groups
    - Do NOT run unrelated application tests
  - [ ] 14.4 Verify Phase 1 end-to-end flow manually
    - Land on hero page, click CTA [E2E-1]
    - Complete all 7 stepper pages with valid data
    - Verify analyzing screen shows for >= 4.8 seconds with 4 sequential steps
    - Verify teaser shows correct points and 3 occupations
    - Enter email, verify lead saved, advance to results
    - Verify skills assessment tab shows 3 occupation cards with state nomination matrices
    - Switch to employer tab, verify employer matches
    - Verify data persists on stepper page refresh
  - [ ] 14.5 Verify Phase 2 end-to-end flow manually
    - Click "Start Document Preparation" from results
    - Complete magic link auth
    - Verify workspace loads with AI greeting referencing matched occupation
    - Chat about employment history, verify document updates in right panel
    - Verify document highlighting on changes
    - Download individual PDF and DOCX
    - Download all as ZIP
    - Close browser, return, verify saved documents and chat history
  - [ ] 14.6 Verify edge cases manually
    - Test minimum input stepper path (skip all optional) [E2E-3]
    - Test mobile responsive layouts (stepper, results, workspace)
    - Test return user auth bypass [AC-AU4]

**Acceptance Criteria:**
- All ~79 feature-specific tests pass
- Phase 1 end-to-end flow works without errors [E2E-1]
- Phase 2 end-to-end flow works without errors [E2E-2]
- Minimum input path completes successfully [E2E-3]
- AI failure degrades gracefully to keyword matching [E2E-4]
- Mobile layouts are usable on all screens
- No console errors during any flow

---

## Execution Order

Recommended implementation sequence:

```
Phase 1 - Foundation (sequential):
  TG1: Project Setup and Configuration
  TG2: Database Schema, Migrations, and Seed Data (depends on TG1)

Phase 2 - Core Business Logic (can run in parallel after TG2):
  TG3: Points Calculator Engine (depends on TG1)
  TG4: State Nomination and Pathway Logic (depends on TG2, TG3)
  TG5: AI Occupation Matching (depends on TG2, TG3)

Phase 3 - Phase 1 Frontend (sequential):
  TG6: Landing Page and Stepper Flow UI (depends on TG1, TG3)
  TG7: Analyzing Screen and Teaser Screen (depends on TG5, TG6)
  TG8: Email Gate, Assessment Persistence, and Full Results Dashboard (depends on TG4, TG7)

Phase 4 - Phase 2 Backend + Auth:
  TG9: Supabase Auth Integration (depends on TG2, TG8)
  TG11: AI Chat API and Duty Alignment Engine (depends on TG5)

Phase 5 - Phase 2 Frontend:
  TG10: Conversational Document Workspace UI (depends on TG9)
  TG12: Document Generation and Download (depends on TG10, TG11)

Phase 6 - Admin + Integration:
  TG13: Admin Data Upload (depends on TG2)
  TG14: End-to-End Flow Verification (depends on all)
```

```
TG1 -> TG2 -> TG3 -> TG4 ---------> TG8 -> TG9 -> TG10 -> TG12
                  \-> TG5 -> TG7 -/           \        /
                        \-> TG6 -/         TG11 ------/
                                    TG13 (can run anytime after TG2)
                                    TG14 (depends on all)
```

## Notes

- **Greenfield project**: No existing code to preserve. All code is new.
- **Legacy code is reference only**: Port logic from legacy `pointsCalculator.ts`, `stateNominationData.ts`, `occupationData.ts` but adapt to the new architecture (server-side DB queries instead of client-side CSV parsing).
- **Testing philosophy**: Write minimal focused tests during development (2-8 per task group). Tests cover critical behaviors only, not exhaustive edge cases. Integration tests added only in TG14 to fill gaps.
- **Mobile-first**: All UI components built mobile-first with progressive enhancement for larger screens per responsive design standards.
- **Validation on both sides**: Client-side validation for UX (disabled buttons, inline errors), server-side Zod validation for security on all API routes.
- **Graceful degradation**: AI failures never block the user. Keyword fallback for occupation matching, empty states for missing data.
- **Session persistence**: Stepper data in sessionStorage to survive page refresh. Assessment data in Supabase for long-term persistence.

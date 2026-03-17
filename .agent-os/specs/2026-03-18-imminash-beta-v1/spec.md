# Specification: Imminash Beta V1

## Goal
Build a full-stack AI-powered Australian migration intelligence and skill assessment document preparation platform in two integrated phases -- Phase 1 (free lead-gen assessment funnel) and Phase 2 (paid conversational document workspace) -- as a greenfield Next.js 15 application replacing the legacy Lovable-built prototype.

## User Stories
- As a skilled visa applicant, I want to input my profile and instantly see my matched ANZSCO occupations, estimated DHA points, visa pathways, and state nomination eligibility so that I can understand my PR options without paying a migration agent.
- As a user who has completed the assessment, I want to prepare skill assessment documents through an AI-guided conversation that generates employment references, CVs, and statutory declarations aligned with my assessing body's requirements so that I can submit my application confidently.

## Specific Requirements

**Next.js 15 App Router Project Setup**
- Initialize Next.js 15 with App Router, React 19, TypeScript strict mode, Tailwind CSS, and shadcn/ui
- Configure Supabase client (auth + database + storage) with environment variables
- Configure Anthropic SDK with AI_MODEL environment variable defaulting to `claude-sonnet-4-6`
- Set up Vercel deployment configuration
- Establish folder structure: `app/` for routes, `components/ui/` for reusable primitives, `components/[feature]/` for feature-specific sections, `lib/` for business logic, `types/` for shared TypeScript interfaces

**Supabase Database Schema and Seed Data**
- Create all 8 tables: leads, profiles, assessments, occupations, state_nominations, invitation_rounds, assessing_body_requirements, documents, conversations
- Schema exactly as specified in decisions: UUIDs for PKs, jsonb for flexible data, proper foreign keys with nullable user_id on assessments for anonymous users
- Seed occupations table from legacy `occupations.csv` (ANZSCO code, title, skill level, assessing authority, list booleans, min 189 points)
- Seed state_nominations table from legacy state CSV files (act.csv, nsw.csv, qld.csv, sa.csv, tas.csv, wa.csv) plus hardcoded VIC and NT rules
- Seed invitation_rounds from legacy `rounds.csv`
- Populate assessing_body_requirements for the Big 4 (ACS, VETASSESS, Engineers Australia, TRA) with required document types, duty descriptors, qualification and experience requirements, formatting notes, and conversation templates
- All tables must include created_at/updated_at timestamptz columns where specified
- Add database indexes on foreign keys and frequently queried columns (anzsco_code, user_id, email)

**Landing / Hero Page**
- Value proposition headline communicating AI-powered migration intelligence
- Trust signals: "Based on official ANZSCO data", "AI-powered matching", "2,400+ profiles analyzed"
- Feature cards highlighting: occupation matching, points calculation, pathway mapping, document preparation
- Single CTA button: "Check My Eligibility" that navigates to the stepper flow
- Mobile-first responsive layout

**7-Page Stepper Flow**
- Page 1 (Basics): First name (text), Age (number, 15-65), Current visa status (dropdown: 500/485/482/Other), Visa expiry date (text, MM/YYYY format)
- Page 2 (Education): Highest education level (dropdown: PhD/Masters/Bachelor/Diploma/Trade), Field of study (text), University name (text, optional), Country of education (pill: Australia/Overseas). Conditional: Australian study 2+ years (pill, only if country=Australia), Regional study (pill, only if Australian study=Yes)
- Page 3 (Additional Qualifications, skippable): Additional degree level (dropdown incl. "None"), Additional field of study (text, conditional on degree selected), Country of additional degree (pill, conditional)
- Page 4 (Work Experience): Working in skilled role (pill: "Yes, currently" / "I was in the past" / "Not yet"), Job title (text, label changes by work status), Australian work experience years (dropdown: None/0-1/1-3/3-5/5-8/8+, conditional on working skilled), Overseas experience years (dropdown, conditional)
- Page 5 (Role Details, conditional): Only shown if user is/was working skilled. Free-text textarea for job duties and responsibilities. Skippable.
- Page 6 (English & Languages): English test score band (dropdown: Superior/Proficient/Competent/Not taken), NAATI/CCL credential (pill: Yes/No)
- Page 7 (Final Details): Professional Year (pill: Yes/No), Relationship status (pill: Single/Have partner), Partner skills assessment (pill: Skilled/English only/Neither, conditional on "Have partner")
- Live points counter in header that animates on change, starting from Page 2 onward
- Points popup micro-celebrations (+5, +10) when points increase
- Session persistence via sessionStorage (key: `imminash_stepper`) so page refresh preserves progress
- Segmented progress bar showing current page out of total active pages (accounts for conditional page skipping)
- Field validation: all required visible fields must be filled before advancing; disabled "Continue" button until valid
- Conditional field visibility driven by prior answers (field-level and page-level conditions)
- Derive `partnerStatus` from the combination of relationshipStatus + partnerSkills fields (Single=10pts, Skilled=10pts, English=5pts, Neither=0pts)

**Points Calculator (Rule-Based Engine)**
- Port exactly from legacy `pointsCalculator.ts` with identical point values and logic
- 10 categories: Age (max 30), English (max 20), Australian Experience (max 20), Offshore Experience (max 15), Education (max 20), Australian Study (max 5), Regional Study (max 5), NAATI/CCL (max 5), Professional Year (max 5), Partner (max 10)
- Combined experience cap: AU + Offshore max 20 points total, AU experience prioritized, offshore fills remainder
- Max possible score: 125. Minimum for 189: 65
- Return PointsBreakdown interface with per-category points, max values, and total
- Lightweight `calcPointsSoFar` variant for the live stepper counter (no async, partial data)

**AI Occupation Matching (API Route)**
- `POST /api/match-occupations` endpoint
- Accept user profile fields: fieldOfStudy, jobTitle, jobDuties, additionalFieldOfStudy, additionalDegreeLevel, additionalDegreeCountry, plus the full skills and employer occupation title arrays
- Send to Claude Sonnet 4.6 via Anthropic SDK using tool use for structured output
- Tool schema: `return_matched_occupations` with skillsMatches (top 5 strings from MLTSSL/STSOL) and employerMatches (top 3 strings from CSOL)
- Validate returned titles against canonical occupation data (case-insensitive match)
- Keyword fallback matching if AI fails or returns insufficient results: bigram scoring from legacy `matchOccupations()` function
- Return top 3 skills matches + top 2 employer matches to frontend
- Zod validation on request body; graceful error handling that returns empty arrays on failure (never blocks the user)

**Analyzing Screen**
- Minimum 4.8 second animated progress with 4 sequential step messages
- Progress ring SVG animation (circular, filling as steps complete)
- Step messages: "Matching your profile to ANZSCO occupations...", "Identifying your assessing authority...", "Estimating your points score...", "Building your skills assessment roadmap..."
- Shimmer skeleton preview below the steps
- Must wait for BOTH the 4.8s animation AND the AI matching API response before advancing
- Use refs to coordinate: `resultsReady` and `analyzingDone` flags, advance only when both are true

**Teaser Screen**
- Animated points counter/ring showing estimated total points out of 125
- Color-coded by threshold: green (>=65), amber (>=50), red (<50)
- Top 3 matched occupations listed with match level badges (High/Medium/Low)
- Blurred preview of full report content below (opacity + blur + pointer-events-none)
- "Unlock Full Report" CTA button overlaid on the blurred section

**Email Gate**
- Email input with regex validation, centered layout
- What-you-unlock checklist: "Detailed points breakdown", "Assessment stream & document checklist", "PR & employer sponsored visa pathways"
- Social proof: "Join 2,400+ others preparing their skills assessment"
- On submit: POST to `/api/leads` saving email, first_name, visa_status, job_title to leads table
- Then advance to Full Results Dashboard
- This email becomes the seed for Phase 2 auth (pre-filled in magic link flow)

**Full Results Dashboard**
- Two-tab layout using shadcn Tabs component
- Tab 1 (Skills Assessment): For each of top 3 matched occupations show: occupation title + ANZSCO code, match level badge (High/Medium/Low with color coding), points gap indicator (above/below 189 threshold with trend icon), 4-stat grid (List Status with tooltip explanation, 189 Min Points, Possibility rating, State Nomination count), Skill Assessing Body name, Pathway Signals (rule-based statements about 189/190/491 eligibility), State Nomination Matrix (8 states x 2 visas with eligible/not eligible/closed status)
- Tab 2 (Employer Sponsored): Top 2 employer-matched occupations, Visa 186 eligibility (requires MLTSSL + 3yrs experience), Visa 482 eligibility (requires CSOL + 1yr experience), empty state if no pathways identified
- Possibility rating logic: High = points >= occupation's 189 threshold AND on MLTSSL, Medium = meets threshold OR on MLTSSL (not both), Low = neither
- State nomination eligibility: port exactly from legacy `stateNominationData.ts` -- NSW (4-digit unit group for 190, 491 closed), VIC (eligible if MLTSSL or STSOL), QLD (ANZSCO code sets), SA (ANZSCO code set, both visas), WA (normalized title matching), TAS (ANZSCO code set), ACT (all 491, all except "491 Only" for 190), NT (fully closed)
- Sticky CTA at bottom: "Start Document Preparation" linking to Phase 2

**Supabase Auth Integration (Magic Link)**
- Passwordless magic link authentication using Supabase Auth
- Triggered when user clicks "Start Document Preparation" from results page
- Email pre-filled from the email gate submission
- On successful auth: create or update profiles table entry linked to auth.users
- Link the anonymous assessment record to the newly authenticated user (update assessments.user_id)
- Redirect to the document workspace after auth completes

**Conversational Document Workspace (Phase 2 Core)**
- Split-panel layout: left panel for AI chat, right panel for document preview
- Mobile responsive: stack vertically with a toggle button to switch between chat and documents
- Left panel: chat message interface with AI and user messages, text input at bottom, send button
- Right panel: tabbed document viewer showing each document type (Employment Reference per role, CV/Resume, Cover Letter/Personal Statement, Statutory Declaration(s), Document Checklist, Submission Guide)
- Documents are VIEW-ONLY in the right panel; all edits must go through the chat
- Pre-fill conversation context from Phase 1: matched occupation, assessing body, job title, field of study, duties (if provided), points score
- AI conversation flow driven by assessing body conversation templates stored in assessing_body_requirements table
- AI uses the body's requirements profile as part of its system prompt to guide conversation and format documents

**AI Chat API (Streaming)**
- `POST /api/chat` endpoint with streaming response
- Accept messages array, assessment context (profile data, matched occupation, assessing body requirements, current documents)
- System prompt includes: assessing body requirements profile, target occupation's ANZSCO duty descriptors, user's existing document content, formatting requirements
- Use Anthropic SDK streaming to return text + document update instructions
- Document updates: AI response includes structured markers indicating which document to update and what content to set
- When AI updates a document, visually highlight the changed sections in the right panel so the user sees what changed

**Duty Alignment Engine**
- User describes duties in plain language through the chat
- AI rewrites duties to align with ANZSCO task descriptors for the matched occupation
- Alignment also considers the specific expectations of the assessing body (stored in assessing_body_requirements)
- Updated duties are reflected in the Employment Reference and CV documents in real-time

**Document Generation and Download**
- `GET /api/documents/[assessmentId]` to retrieve all documents for an assessment
- `POST /api/documents/[documentId]/download` to generate PDF or DOCX for a single document
- `POST /api/documents/[assessmentId]/download-all` to generate a ZIP containing PDF + DOCX for all documents
- PDF generation via @react-pdf/renderer or similar server-side library
- DOCX generation via the `docx` npm package
- Documents saved to Supabase Storage, linked to user account via storage_path in documents table
- "Download All" button in the workspace UI; individual document download also available
- Users can return later, see their saved documents, and continue the conversation

**Assessment Persistence**
- `POST /api/assessments` endpoint to save completed Phase 1 results
- Store profile_data (all stepper form data as jsonb), points_breakdown (category-by-category as jsonb), total_points (integer), matched_occupations (skills + employer matches with metadata as jsonb)
- Anonymous users: assessment saved with null user_id, linked to lead_id
- Authenticated users: assessment linked to user_id

**Admin Data Upload**
- `POST /api/admin/upload-data` endpoint for the founder to refresh occupation, state nomination, and invitation round data
- Accept CSV file upload
- Simple authentication (can be a shared secret or Supabase auth check for admin role)
- Parse CSV and upsert into the appropriate table

## Existing Code to Leverage

**Legacy pointsCalculator.ts**
- Complete DHA points calculation with all 10 categories, combined experience cap logic, and PointsBreakdown interface
- Port the `estimatePoints()` function as-is to `lib/points-calculator.ts`
- Port `calcPointsSoFar()` from StepperFlow for the live counter (lightweight partial-data variant)
- Port `assessingAuthorityInfo` map for cost/timeline display on results
- Port `parseExperienceYears()` helper for employer sponsored eligibility checks

**Legacy stateNominationData.ts**
- Complete state nomination eligibility logic for all 8 states/territories with CSV parsing
- Port the `getStateEligibility()` function, but adapt from client-side CSV fetching to server-side database queries against the state_nominations table
- NSW uses 4-digit unit group matching, WA uses normalized title matching, others use 6-digit ANZSCO codes
- VIC derived from list membership (MLTSSL or STSOL), NT fully closed, ACT all eligible for 491

**Legacy occupationData.ts**
- Occupation interface, UserData interface, MatchResult interface for TypeScript types
- `matchOccupations()` keyword fallback with bigram scoring for when AI matching fails
- `getPathwaySignal()` for generating rule-based visa pathway statements
- `getPrimaryList()` for determining MLTSSL/CSOL/STSOL/ROL from occupation data
- CSV parsing helpers (can be replaced with database queries in the new version)

**Legacy match-occupations Supabase Function**
- AI matching prompt structure: user profile fields + two occupation lists (skills vs employer)
- Tool use schema for structured output (skillsMatches + employerMatches arrays)
- Case-insensitive validation of AI-returned titles against canonical data
- Replace Lovable AI gateway with direct Anthropic SDK; replace Gemini model with Claude Sonnet 4.6

**Legacy UX Component Patterns (StepperFlow, AnalyzingScreen, TeaserScreen, EmailGate, FullResultScreen)**
- Stepper: page/field config array pattern with conditional visibility, session persistence via sessionStorage, live points counter with popup animation, pill-style select for binary/ternary choices
- Analyzing: 4-step timed sequence with progress ring SVG, dual-flag coordination (resultsReady + analyzingDone)
- Teaser: animated counter, points ring with color thresholds, blurred preview overlay
- Email gate: regex validation, unlock checklist, social proof
- Full Results: two-tab layout, occupation cards with 4-stat grid, state nomination matrix inline, possibility rating logic, employer sponsored eligibility, sticky CTA

## Acceptance Criteria and Test Cases

### Points Calculator Tests

Every test case below MUST pass. These are derived from the official DHA points table and the combined experience cap rule.

**Test Case PC-1: Maximum points profile**
- Input: Age=28, English=Superior, AU Experience=8+yrs, Offshore=0, Education=PhD, AU Study=Yes, Regional=Yes, NAATI=Yes, Professional Year=Yes, Single
- Expected: Age=30, English=20, AU Exp=20, Offshore=0, Education=20, AU Study=5, Regional=5, NAATI=5, PY=5, Partner=10, **Total=120**

**Test Case PC-2: Combined experience cap (AU prioritized)**
- Input: AU Experience=8+yrs (20pts), Offshore Experience=5-8yrs (15pts)
- Expected: AU Exp=20, Offshore=0, **Combined=20** (cap hit, AU fills first, no room for offshore)

**Test Case PC-3: Combined experience cap (partial fill)**
- Input: AU Experience=1-3yrs (5pts), Offshore Experience=5-8yrs (15pts)
- Expected: AU Exp=5, Offshore=15, **Combined=20** (cap hit, 5+15=20)

**Test Case PC-4: Combined experience cap (under cap)**
- Input: AU Experience=1-3yrs (5pts), Offshore Experience=1-3yrs (5pts)
- Expected: AU Exp=5, Offshore=5, **Combined=10** (under 20 cap, no adjustment)

**Test Case PC-5: Minimum viable 189 profile**
- Input: Age=30, English=Proficient, AU Experience=3-5yrs, Offshore=0, Education=Bachelor, AU Study=No, Regional=No, NAATI=No, PY=No, Single
- Expected: Age=25, English=10, AU Exp=10, Education=15, Partner=10, **Total=70** (above 65 threshold)

**Test Case PC-6: Below 189 threshold**
- Input: Age=42, English=Competent, AU Experience=0, Offshore=1-3yrs, Education=Diploma, AU Study=No, Regional=No, NAATI=No, PY=No, Partner with neither
- Expected: Age=15, English=0, Offshore=5, Education=10, Partner=0, **Total=30** (below 65)

**Test Case PC-7: Partner status combinations**
- Single -> 10pts
- Partner with skilled assessment + competent English -> 10pts
- Partner with competent English only -> 5pts
- Partner with neither -> 0pts

**Test Case PC-8: Age boundary values**
- Age=17 -> 0pts (below 18)
- Age=18 -> 25pts
- Age=24 -> 25pts
- Age=25 -> 30pts
- Age=32 -> 30pts
- Age=33 -> 25pts
- Age=39 -> 25pts
- Age=40 -> 15pts
- Age=44 -> 15pts
- Age=45 -> 0pts

**Test Case PC-9: Education levels**
- PhD/Doctorate -> 20pts
- Masters -> 15pts
- Bachelor -> 15pts
- Diploma/Advanced Diploma -> 10pts
- Trade Qualification -> 10pts

**Test Case PC-10: calcPointsSoFar with partial data**
- Input: Only Age=28 provided, all other fields undefined
- Expected: Total=30 (only age points counted, no errors thrown)

### Possibility Rating Tests

**Test Case PR-1: High possibility**
- Input: user points=85, occupation min_189_points=80, list=MLTSSL
- Expected: "High"

**Test Case PR-2: Medium (points meet, wrong list)**
- Input: user points=85, occupation min_189_points=80, list=STSOL
- Expected: "Medium"

**Test Case PR-3: Medium (right list, points below)**
- Input: user points=70, occupation min_189_points=85, list=MLTSSL
- Expected: "Medium"

**Test Case PR-4: Low**
- Input: user points=70, occupation min_189_points=85, list=STSOL
- Expected: "Low"

**Test Case PR-5: No 189 round data**
- Input: user points=80, occupation min_189_points=null, list=MLTSSL
- Expected: "Medium" (on MLTSSL but no threshold to compare)

### State Nomination Tests

**Test Case SN-1: NSW unit group matching**
- Input: ANZSCO code "261311" (Analyst Programmer), unit group "2613"
- Expected: NSW 190 = eligible (if 2613 is in NSW list), NSW 491 = closed

**Test Case SN-2: VIC list derivation**
- Input: occupation on MLTSSL
- Expected: VIC 190 = eligible, VIC 491 = eligible
- Input: occupation on CSOL only
- Expected: VIC 190 = not eligible, VIC 491 = not eligible

**Test Case SN-3: NT always closed**
- Input: any occupation
- Expected: NT 190 = closed, NT 491 = closed

**Test Case SN-4: ACT rules**
- Input: occupation NOT marked "(491 Only)"
- Expected: ACT 190 = eligible, ACT 491 = eligible
- Input: occupation marked "(491 Only)"
- Expected: ACT 190 = not eligible, ACT 491 = eligible

**Test Case SN-5: WA title matching**
- Input: occupation title "Software Engineer" (exact match in WA list)
- Expected: WA 190 = eligible, WA 491 = eligible
- Input: occupation title not in WA list
- Expected: WA 190 = not eligible, WA 491 = not eligible

### Employer Sponsored Eligibility Tests

**Test Case ES-1: Visa 186 eligible**
- Input: occupation on MLTSSL, AU experience = 3-5yrs
- Expected: 186 = eligible

**Test Case ES-2: Visa 186 ineligible (experience)**
- Input: occupation on MLTSSL, AU experience = 1-3yrs
- Expected: 186 = not eligible (needs 3+ years)

**Test Case ES-3: Visa 186 ineligible (list)**
- Input: occupation on CSOL only, AU experience = 5-8yrs
- Expected: 186 = not eligible (needs MLTSSL)

**Test Case ES-4: Visa 482 eligible**
- Input: occupation on CSOL, total experience >= 1yr
- Expected: 482 = eligible

**Test Case ES-5: Visa 482 ineligible**
- Input: occupation on CSOL, total experience = 0
- Expected: 482 = not eligible

### AI Occupation Matching Tests

**Test Case AI-1: Structured output validation**
- Input: valid profile with fieldOfStudy="Computer Science", jobTitle="Software Engineer"
- Expected: API returns { skillsMatches: [...], employerMatches: [...] } with valid occupation titles that exist in the occupations table

**Test Case AI-2: Canonical validation rejects hallucinated titles**
- Simulated AI response includes "Chief Innovation Officer" (not in ANZSCO)
- Expected: title is filtered out, not returned to frontend

**Test Case AI-3: Fallback to keyword matching**
- Simulated AI failure (network error or empty response)
- Expected: keyword fallback returns results, API does not return 500

**Test Case AI-4: Empty profile graceful handling**
- Input: all optional fields empty, only fieldOfStudy provided
- Expected: API returns matches (may be lower confidence), does not error

**Test Case AI-5: Match level assignment**
- Keyword fallback score >= 4 -> "High"
- Keyword fallback score >= 2 -> "Medium"
- Keyword fallback score < 2 -> "Low"

### Stepper Flow Acceptance Criteria

**AC-S1: Session persistence**
- Fill pages 1-4, refresh the browser
- Expected: all previously entered data is restored from sessionStorage
- Key: `imminash_stepper`

**AC-S2: Conditional page visibility**
- Select "Not yet" for skilled role on Page 4
- Expected: Page 5 (Role Details) is skipped entirely, progress bar adjusts to show 6 pages instead of 7

**AC-S3: Conditional field visibility**
- Select "Overseas" for country of education on Page 2
- Expected: Australian study and Regional study fields are NOT shown

**AC-S4: Field validation blocks advancement**
- Leave required fields empty on any page, click Continue
- Expected: Continue button is disabled, validation errors shown

**AC-S5: Live points counter accuracy**
- Fill all fields across all pages
- Expected: points counter matches the output of `estimatePoints()` called with the same data at every step

**AC-S6: Points popup appears on change**
- Change English from Competent to Proficient
- Expected: "+10" popup animation appears near the points counter

**AC-S7: Dynamic labels**
- Select "I was in the past" for skilled role
- Expected: Job title label reads "Previous job title" (not "Current job title")

### Analyzing Screen Acceptance Criteria

**AC-AN1: Minimum duration**
- Even if AI responds in 500ms, screen stays for at least 4.8 seconds

**AC-AN2: Waits for AI**
- Simulate AI taking 10 seconds
- Expected: screen stays until AI completes (does not advance at 4.8s)

**AC-AN3: 4 sequential steps**
- All 4 step messages appear in order, each visible for ~1.2 seconds

### Email Gate Acceptance Criteria

**AC-EG1: Valid email required**
- Input: "notanemail"
- Expected: submit button disabled

**AC-EG2: Lead saved to database**
- Submit valid email
- Expected: leads table contains new row with email, first_name, visa_status, job_title

**AC-EG3: Advances to results**
- After successful submit, screen transitions to Full Results Dashboard

### Full Results Dashboard Acceptance Criteria

**AC-FR1: Occupation cards show correct data**
- For each matched occupation: ANZSCO code, title, match level, list status, assessing body, min 189 points all match the database record

**AC-FR2: Points gap calculation**
- User has 80 points, occupation min_189_points = 85
- Expected: shows "5 points below threshold" with appropriate icon

**AC-FR3: State nomination matrix completeness**
- Every occupation card shows all 8 states + both visa types (190, 491)
- NT always shows "closed" for both

**AC-FR4: Employer tab shows correct eligibility**
- Visa 186/482 eligibility matches the rules (ES-1 through ES-5 above)
- If no employer matches exist, shows empty state message

**AC-FR5: Tabs switch correctly**
- Click "Employer Sponsored" tab
- Expected: skills assessment content hidden, employer content shown

### Auth Flow Acceptance Criteria

**AC-AU1: Magic link triggers**
- Click "Start Document Preparation"
- Expected: auth modal appears with email pre-filled from gate

**AC-AU2: Assessment linked to user**
- After auth completes, the anonymous assessment record is updated with the user's ID

**AC-AU3: Profile created**
- After first auth, profiles table contains entry linked to auth.users

**AC-AU4: Return user**
- User who already authenticated clicks "Start Document Preparation" again
- Expected: skips auth, goes directly to workspace

### Document Workspace Acceptance Criteria

**AC-DW1: Context pre-filled**
- AI's first message references the user's matched occupation, assessing body, and any data from Phase 1

**AC-DW2: Document tabs appear**
- Right panel shows tabs for all required document types for the user's assessing body

**AC-DW3: Real-time document updates**
- User provides employment details in chat
- Expected: Employment Reference document on right panel updates within the same response cycle

**AC-DW4: Change highlighting**
- When AI updates a document section, the changed text is visually highlighted (background color or animation)

**AC-DW5: Documents are view-only**
- User cannot click into or type in the right panel documents
- All modifications happen through chat messages

**AC-DW6: Mobile layout**
- On viewport < 768px: panels stack vertically with a toggle button
- Toggle switches between chat view and document view
- Both views are fully usable on mobile

**AC-DW7: Conversation persistence**
- User leaves and returns to workspace
- Expected: previous chat messages and documents are restored from database

**AC-DW8: Body-specific conversation flow**
- ACS assessment: AI asks about ICT-specific duties, major/minor specialization
- VETASSESS assessment: AI asks duties mapped to ANZSCO unit group descriptors
- Different bodies result in different conversation structures

### Document Download Acceptance Criteria

**AC-DD1: Single document PDF**
- Click download on one document
- Expected: valid PDF file downloads with formatted content matching the preview

**AC-DD2: Single document DOCX**
- Click download DOCX option
- Expected: valid .docx file that opens in Word/Google Docs with correct formatting

**AC-DD3: Download all ZIP**
- Click "Download All"
- Expected: ZIP file containing PDF + DOCX for every document in the assessment

**AC-DD4: Documents saved to storage**
- After download, storage_path in documents table is populated
- File exists in Supabase Storage at that path

### Data Management Acceptance Criteria

**AC-DM1: CSV upload updates occupations**
- Upload new occupations.csv via admin endpoint
- Expected: occupations table reflects new data (upsert, not duplicate)

**AC-DM2: CSV upload updates state nominations**
- Upload new state CSV
- Expected: state_nominations table updated for that state

**AC-DM3: Admin endpoint requires authentication**
- Call endpoint without valid auth
- Expected: 401 Unauthorized

### Database Seed Verification

**AC-DB1: Occupation count matches legacy**
- After seeding, occupations table row count matches legacy CSV row count (~575 occupations)

**AC-DB2: State nomination coverage**
- Every occupation with MLTSSL=true has state nomination records for all 8 states

**AC-DB3: Invitation rounds loaded**
- invitation_rounds table contains all rows from legacy rounds.csv

**AC-DB4: Big 4 assessing body requirements populated**
- assessing_body_requirements table has entries for ACS, VETASSESS, Engineers Australia, TRA
- Each entry has non-empty required_documents, duty_descriptors, and conversation_template

### End-to-End Flow Tests

**Test Case E2E-1: Complete Phase 1 happy path**
1. Land on hero page, click CTA
2. Complete all 7 stepper pages with valid data
3. See analyzing screen for >= 4.8 seconds
4. See teaser with points and 3 occupations
5. Enter email, unlock full report
6. See skills assessment tab with 3 occupation cards, each with state nomination matrix
7. Switch to employer tab, see employer matches
- All screens transition correctly, no errors in console, data persists on refresh during stepper

**Test Case E2E-2: Complete Phase 2 happy path**
1. From results page, click "Start Document Preparation"
2. Auth via magic link (or skip if already authenticated)
3. See split-panel workspace with AI greeting referencing their occupation
4. Respond to AI prompts about employment history
5. See Employment Reference document update in right panel
6. Continue conversation until AI signals completion
7. Download all documents as ZIP
8. Close browser, return, see saved documents and chat history

**Test Case E2E-3: Stepper with minimum input**
1. Fill only required fields (skip all optional pages/fields)
2. Expected: flow completes, points calculated correctly with 0 for skipped categories, occupation matching still works

**Test Case E2E-4: AI matching failure graceful degradation**
1. Simulate AI API failure during analyzing screen
2. Expected: fallback keyword matching runs, user still sees results (may be lower quality matches), no error screen shown

## Out of Scope
- Payment and pricing integration (pricing deferred; no Stripe, no paywalls)
- Analytics and tracking (no PostHog, no GA, no event tracking)
- SEO optimization (no meta tags strategy, no sitemap, no structured data)
- Onboarding or transactional emails (no welcome emails, no email sequences)
- Notification system (no in-app notifications, no push notifications)
- Admin review panel for migration agents (founder reviews outside the platform)
- AI chat widget on the Phase 1 results page (the legacy OccupationChat component is not carried forward)
- Multi-language support
- Human-in-the-loop review workflow (Phase 3 roadmap item)
- EOI preparation features (Phase 4 roadmap item)
- Migration agent portal or B2B features (Phase 5 roadmap item)

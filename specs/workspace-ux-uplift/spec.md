# Specification: Workspace UX Uplift - Case Strategist Transformation

## Goal
Transform the Imminash workspace from a document generator into a Case Strategist that drafts documents as a byproduct of case guidance, fixing critical data integrity bugs and delivering the "$2000 agent at $199" experience for ACS skills assessment applicants.

## User Stories
- As a skilled migration applicant, I want my AI consultant to draft reference letters immediately from my CV so that I spend minutes reviewing instead of hours answering questions.
- As a user with multiple employers, I want each reference letter tracked and approved independently so that no document is silently overwritten.
- As a returning user, I want my progress fully preserved across sessions so that I never lose approved documents or conversation history.

## Specific Requirements

**1a. ANZSCO Mismatch Bug Fix**
- Add `selected_anzsco_code` column to the `assessments` table via Supabase migration
- When user selects an occupation on the results page, persist it to `assessments.selected_anzsco_code` instead of only writing to sessionStorage
- Update `workspace/page.tsx` to read `selected_anzsco_code` from the assessment row as the primary source, falling back to `skillsMatches[0]` only if null
- Update `chat/route.ts` (line 73-78) to read `selected_anzsco_code` from the assessment row instead of rebuilding from `skillsMatches[0]`
- Update `download-all/route.ts` (line 136-140) cover sheet generation to read from `selected_anzsco_code` instead of `skillsMatches[0]`
- sessionStorage becomes a write-through cache only, never the source of truth

**1b. Multi-Employer Document Overwrite Fix**
- Change the `[DOC_UPDATE:employment_reference]` marker format to employer-keyed markers: `[DOC_UPDATE:employment_reference:CompanyName]`
- Update `DOC_UPDATE_REGEX` in `duty-alignment.ts` to capture an optional third segment after the document type (the employer key)
- `parseDocumentUpdates` must return `employment_reference_google`, `employment_reference_atlassian` etc. as distinct `documentType` values
- Each employer-keyed reference letter becomes its own row in the `documents` table
- Update the system prompt in `chat-prompt.ts` Steps 7 and 8 to emit keyed markers instead of the generic `employment_reference`
- Sidebar shows "Ref - Google", "Ref - Atlassian" etc. (already partially implemented via `employerNames` extraction in `WorkspaceLayout.tsx`)

**1c. Approval State Persistence**
- Add `status` column to the `documents` table with values: `draft`, `in_review`, `approved` (default: `draft`)
- When user clicks Approve in `WorkspaceLayout.tsx`, write `status = 'approved'` to the `documents` table immediately via Supabase client
- On workspace load in `workspace/page.tsx`, read `status` from each document row and populate `approvedDocTypes` from DB instead of starting with an empty Set
- `download-all/route.ts` should check that all required documents have `status = 'approved'` before generating the ZIP; return 400 if incomplete
- Remove the in-memory-only `approvedDocTypes` useState in favour of DB-derived state

**1d. Conversation Save Robustness**
- Move conversation save from post-stream only (line 160 in `chat/route.ts`) to save after every completed user+AI message pair
- Save documents to DB immediately when `[DOC_UPDATE]` markers are parsed, not bundled with conversation save
- Add a subtle "Saved" text indicator in the sidebar footer that flashes for 2 seconds after each successful save
- On workspace reload with existing conversation, prepend a "Welcome back" recap message from the AI summarising progress so far

**1e. CV Upload Data Feed-Through**
- The `parse-cv/route.ts` already extracts `employers[]` and `qualifications[]` but `ChatPanel.tsx` (line 190-191) reduces the response to `result.summary` only
- Pass the full parsed CV response (employers, qualifications, extracted text) into workspace state
- Forward CV-extracted data into the chat API request body so the system prompt can reference it
- System prompt should use CV employer names, titles, dates, and any duty descriptions to generate strawman reference letters immediately

**2. Case Dashboard (Opening Experience)**
- Render a dashboard card at the top of Zone 2 (chat area) before any chat messages
- Card contents: ANZSCO code + occupation title, ACS pathway (ICT Major/Minor/RPL) inferred from qualifications, number of reference letters needed, risk flags (e.g. "one role under 1 year")
- Hero CV upload area: large drop zone with "Drop your CV here or click to upload (PDF, DOCX)" prompt, visually prominent
- "Or skip - answer questions instead" link below the drop zone
- Card remains visible but collapses to a compact summary bar after the first chat message is sent

**3. Draft First Flow (System Prompt Rewrite)**
- With CV: AI parses CV data, immediately generates a strawman reference letter per employer using ANZSCO duty descriptors + CV data, then asks 2-3 targeted gap-fill questions per employer
- Without CV: 3-question interview per employer instead of the current 8-question interrogation. Q1: day-to-day duties, Q2: tools/technologies/methodologies, Q3: leadership/mentoring
- Rewrite the 11-step conversation sequence in `chat-prompt.ts` to implement draft-first-then-refine instead of interrogate-then-draft
- Document panel slides in automatically when AI generates a draft
- Keep all ANZSCO duty alignment rules and eligibility checks from the existing prompt

**4. Case Navigator Sidebar (Zone 1 Redesign)**
- Top section: case badge showing assessing authority + occupation title + ANZSCO code (existing badge component, already implemented)
- Middle section: dynamic document list with employer-specific entries, status dots (grey = not started, amber = draft/in progress, green = approved)
- Add coverage score per reference letter showing "X/8" ANZSCO duty areas covered
- Bottom section: "Submission Readiness" progress bar based on DB-persisted approval status, showing "X of Y documents ready"
- Download All button: disabled until all documents are approved (read from DB status, not React state)
- "Saved" flash indicator after each successful DB write
- Mobile: collapses to hamburger, opens as overlay (already implemented)

**5. ANZSCO X-Ray Mode (Document Preview)**
- Add a toggle in Zone 3 between "Clean View" and "X-Ray View"
- X-Ray View: each ANZSCO-aligned sentence in the document gets a subtle highlight colour
- Hover/tap on a highlighted sentence shows a tooltip mapping it to the specific ANZSCO core task (e.g. "Maps to ANZSCO 261111 Core Task 3: working with users to formulate and document business requirements")
- Summary bar at the bottom of the document: "Coverage: 7/8 ANZSCO duty areas covered. Missing: Task 5 (data modelling)"
- AI must tag sentences with ANZSCO task numbers in its document output (add metadata to `[DOC_UPDATE]` content)

**6. Guided Revisions (Highlight-to-Revise)**
- Documents remain view-only (no contentEditable) to protect ANZSCO compliance
- User selects/highlights text in the document preview; a popover appears with "What would you like to change?" and a text input
- User types their intent (e.g. "I used Monday.com, not Jira"); the revision request is sent to the chat API as a structured message
- AI regenerates the relevant section while preserving ANZSCO compliance
- If the requested change would weaken compliance, AI responds with a warning explaining the impact and suggesting an alternative before proceeding

**7. Fact-Check Declaration**
- Before the Approve button becomes clickable on any document, user must check a checkbox
- Checkbox text is dynamic per employer: "I confirm the duties, tools, and technologies listed accurately reflect my experience at [Employer Name] ([dates])."
- This is not a legal waiver; it forces high-attention reading of the generated content
- Store the declaration timestamp and checkbox state alongside the document approval in the DB

**8. Proactive CPD Coach**
- When AI reaches the CPD section, ask about CPD activities with concrete examples: "online courses, conferences, certifications, self-study"
- If user has few or no activities, flag as a risk: "ACS requires evidence of continued learning. You currently have 1 activity - that's a risk area."
- Suggest 2-3 specific free courses relevant to their ANZSCO code (LinkedIn Learning, Coursera)
- Generate CPD log with existing activities marked "Complete" and suggested ones marked "Planned"

**9. Manager Briefing Email Template**
- After each reference letter is approved, generate a ready-to-send email template addressed to that employer's manager
- Email explains why exact wording matters (ACS compliance, occupational codes) and asks the manager to place on company letterhead and sign without modifying duty statements
- Include the email template in the ZIP package per employer (e.g. "Manager_Email_Google.txt")
- Add `manager_briefing_email` as a new document type in the system

**10. Completion Dashboard**
- After all documents are approved, chat transitions to a completion state
- Show compliance summary: X/8 duty areas covered across all letters
- Full manifest of everything in the ZIP (ref letters, supporting statement, CPD log, checklist, manager emails, cover sheet)
- Next Steps guide: send manager emails, complete planned CPD courses, submit via myimmiAccount, expected 8-12 week processing time, "return here if ACS requests more info"
- "Download Complete Package" button

**11. Post-Download Referral Prompt**
- After successful ZIP download, show a sharing prompt: "Know someone preparing for their skills assessment?"
- Copy-link button to share imminash URL
- "Maybe Later" dismiss option
- No discount mechanics; capture the peak-end moment only

**12. Zone 3 Panel Behaviour**
- Slides in from the right when AI generates or updates a document; Zone 2 (chat) shrinks to 50% width
- Toggle between Clean View and X-Ray View inside the panel
- Highlight-to-revise works in both view modes
- Bottom of panel: fact-check checkbox + Approve button
- Can be dismissed to return full-width chat
- After approval: auto-collapses, AI sends confirmation message and moves to the next employer
- Mobile: opens as a bottom sheet (70% viewport height) with the last chat message visible above

## Existing Code to Leverage

**WorkspaceLayout.tsx - 3-zone orchestration**
- Already implements the 3-zone layout with Zone 1 sidebar (220px), Zone 2 chat, Zone 3 preview panel
- `approvedDocTypes` state and `handleApproveDocument` callback exist but are in-memory only; refactor to write/read from DB
- `sidebarDocs` memo already handles dynamic employer-specific entries via `employerNames` extraction; extend with coverage scores
- `previewOpen` / `previewDocType` state already manages Zone 3 slide-in behaviour

**duty-alignment.ts - Marker parsing engine**
- `DOC_UPDATE_REGEX`, `parseDocumentUpdates`, `parseACSFormUpdates`, and `stripDocumentMarkers` handle all AI response parsing
- `extractEmployersFromMessages` scans conversation for `[EMPLOYER:Name]` markers; already powers sidebar employer list
- Extend `DOC_UPDATE_REGEX` to support the employer-keyed format `[DOC_UPDATE:type:employer_key]`

**chat-prompt.ts - System prompt construction**
- `buildACSSystemPrompt` contains the full 11-step conversation flow, 8 duty elicitation questions, eligibility rules, and reference letter template
- Rewrite the step sequence for draft-first flow while preserving all ANZSCO duty descriptors, eligibility rules, and letter template blocks
- `buildGenericSystemPrompt` remains unchanged (non-ACS bodies)

**parse-cv/route.ts - CV parsing pipeline**
- Already extracts `employers[]` (name, title, startDate, endDate) and `qualifications[]` (name, institution, year) via regex heuristics
- Already returns structured JSON with quality-tiered summary messages
- Extend the response to include the full extracted data in workspace state rather than reducing to `summary` only in `ChatPanel.tsx`

**DocumentSidebar.tsx - Zone 1 sidebar component**
- `getStatusIcon` and `getStatusDotColor` already map `not_started`/`in_progress`/`approved` to visual indicators
- Progress bar and download button already exist; refactor label from "Progress" to "Submission Readiness"
- Mobile hamburger/overlay pattern already implemented

## Evaluation Criteria

Every requirement has concrete, machine-verifiable evals. Two eval layers: **Vitest unit/integration tests** for logic and data integrity, **Playwright browser tests** for UI behavior and end-to-end flows.

### Setup Required
- Vitest already configured (`vitest.config.ts`), zero existing tests
- Add Playwright: `@playwright/test` with a `playwright.config.ts` targeting `localhost:3000`
- Test files: `src/**/__tests__/*.test.ts` for Vitest, `e2e/**/*.spec.ts` for Playwright

### 1a. ANZSCO Mismatch Bug Fix
**Vitest:**
- `selected_anzsco_code` column exists on assessments table (migration test)
- `workspace/page.tsx` loader reads `selected_anzsco_code` from assessment row; when set, it takes precedence over `skillsMatches[0]`
- `chat/route.ts` system prompt contains the user-selected ANZSCO code, not `skillsMatches[0]`, when `selected_anzsco_code` is set
- `download-all/route.ts` cover sheet uses `selected_anzsco_code` when present

**Playwright:**
- Navigate to results page, select occupation #2, proceed to workspace; verify sidebar badge shows occupation #2's ANZSCO code, not #1's
- Verify the AI's first message references the correct occupation title matching what was selected

### 1b. Multi-Employer Document Overwrite Fix
**Vitest:**
- `parseDocumentUpdates("[DOC_UPDATE:employment_reference:Google]content1[/DOC_UPDATE][DOC_UPDATE:employment_reference:Atlassian]content2[/DOC_UPDATE]")` returns 2 distinct updates with `documentType` = `employment_reference_google` and `employment_reference_atlassian`
- `parseDocumentUpdates("[DOC_UPDATE:employment_reference]old format[/DOC_UPDATE]")` still works (backward compat)
- `extractEmployersFromMessages` correctly extracts employer names from keyed markers
- `stripDocumentMarkers` removes employer-keyed markers cleanly

**Playwright:**
- In workspace, complete duties for 2 employers; verify sidebar shows 2 separate reference letter entries (e.g. "Ref - Google", "Ref - Atlassian")
- Approve employer 1's letter, then generate employer 2's; verify employer 1's document still exists and is still approved in sidebar

### 1c. Approval State Persistence
**Vitest:**
- Calling approve endpoint sets `documents.status = 'approved'` in DB
- `download-all/route.ts` returns 400 when any required document has `status != 'approved'`
- `download-all/route.ts` returns 200 with ZIP when all documents are approved

**Playwright:**
- Approve a document in the workspace, hard-refresh the page; verify the document still shows as approved (green dot) in sidebar
- Verify progress bar reflects DB-persisted approval count after refresh

### 1d. Conversation Save Robustness
**Vitest:**
- After a chat message exchange completes, conversation is saved to DB (query conversations table, verify messages array includes the latest pair)
- Document updates are saved to DB immediately when markers are parsed, independent of conversation save

**Playwright:**
- Send a message in workspace chat, wait for AI response, hard-refresh; verify conversation history is preserved and the last message pair is visible
- Verify "Saved" indicator appears in sidebar after AI response completes

### 1e. CV Upload Data Feed-Through
**Vitest:**
- `parse-cv/route.ts` response includes `employers[]` and `qualifications[]` arrays (not just `summary`)
- Chat API request body accepts `cvData` field and system prompt includes employer names/titles/dates from CV when provided

**Playwright:**
- Upload a test PDF CV in the workspace; verify the AI's next message references employer names extracted from the CV
- Verify sidebar document list populates with employer-specific reference letter entries from CV data

### 2. Case Dashboard
**Playwright:**
- Navigate to workspace; verify Case Dashboard card is visible before any chat messages
- Card displays ANZSCO code, occupation title, pathway, and number of reference letters
- CV upload drop zone is visible and accepts file drag/drop
- "Skip" link is visible below the drop zone
- After sending first chat message, dashboard card collapses to compact summary bar

### 3. Draft First Flow
**Vitest:**
- System prompt (built by `buildACSSystemPrompt`) contains "Draft First" instructions, not the old 8-question sequence
- When CV data is provided to the prompt builder, the output includes instructions to generate strawman letters immediately
- When no CV data is provided, the prompt includes exactly 3 questions per employer (day-to-day, tools, leadership)

**Playwright:**
- Upload CV, verify AI generates a strawman reference letter (Zone 3 panel opens) within the first 2-3 messages without asking 8 questions
- Skip CV, verify AI asks exactly 3 broad questions per employer, then generates a draft letter
- After strawman is shown, verify AI asks 2-3 targeted gap-fill questions (not 8)

### 4. Case Navigator Sidebar
**Playwright:**
- Verify sidebar shows case badge with assessing authority, occupation title, and ANZSCO code
- Verify document list shows employer-keyed entries with status dots
- Verify "Submission Readiness" progress bar shows "X of Y documents ready"
- Approve a document; verify progress bar updates and dot turns green
- Download All button is disabled when not all documents are approved; enabled when all are

### 5. ANZSCO X-Ray Mode
**Playwright:**
- When document preview (Zone 3) is open, verify toggle exists for "Clean View" / "X-Ray View"
- Click "X-Ray View"; verify highlighted sentences appear in the document
- Hover over a highlighted sentence; verify tooltip appears with ANZSCO task mapping text
- Verify coverage summary bar appears at bottom showing "X/8 duty areas covered"

### 6. Guided Revisions
**Playwright:**
- In document preview, select/highlight a sentence; verify popover appears with text input
- Type a revision request and submit; verify AI regenerates the section (new content appears in document)
- Request a revision that would weaken compliance; verify AI shows a warning message before proceeding

### 7. Fact-Check Declaration
**Playwright:**
- When viewing a document for review, verify Approve button is disabled/greyed out
- Verify a checkbox is visible with employer-specific confirmation text
- Check the checkbox; verify Approve button becomes enabled
- Uncheck it; verify Approve button is disabled again

### 8. Proactive CPD Coach
**Vitest:**
- System prompt includes CPD coaching instructions with specific course suggestion behavior
- CPD log document generation distinguishes between "Complete" and "Planned" activities

**Playwright:**
- In workspace, when AI reaches CPD section and user indicates minimal CPD, verify AI response contains course suggestions with links
- Verify generated CPD log document shows both "Complete" and "Planned" entries with visual distinction

### 9. Manager Briefing Email
**Vitest:**
- After reference letter approval, `manager_briefing_email` document type is created in DB for that employer
- ZIP download includes `Manager_Email_[EmployerName].txt` files

**Playwright:**
- Approve a reference letter; verify a manager email template appears in the sidebar document list or is mentioned by the AI
- Download ZIP; verify it contains a manager email file for each approved reference letter

### 10. Completion Dashboard
**Playwright:**
- Approve all documents; verify chat transitions to completion state with compliance summary
- Verify next-steps guide is displayed with all 5 steps (manager emails, CPD courses, myimmiAccount, processing time, return info)
- Verify "Download Complete Package" button is visible and clickable

### 11. Post-Download Referral Prompt
**Playwright:**
- Click "Download Complete Package"; after download completes, verify referral prompt appears
- Verify "Copy Link to Share" button exists and copies URL to clipboard
- Verify "Maybe Later" dismiss option exists and hides the prompt

### 12. Zone 3 Panel Behaviour
**Playwright:**
- When AI generates a document, verify Zone 3 slides in from the right (chat width reduces)
- Verify toggle between Clean View and X-Ray View works
- Verify panel can be dismissed (X button or gesture) and chat returns to full width
- Approve document; verify panel auto-collapses
- On mobile viewport (375px), verify document opens as bottom sheet, not side panel

## Out of Scope
- Mobile-optimised document editing (mobile is for paying, uploading CV, and checking progress only)
- Inline document editing or contentEditable in the document preview (keep view-only + guided revisions)
- Multi-body support beyond ACS (hardcode ACS-specific logic; data model supports future bodies but no UI/prompt work for them)
- Referral discount mechanics or promo codes
- Email notification system (no transactional emails)
- Agent review tier or human-in-the-loop review service
- Changes to the payment flow or pricing
- Changes to the assessment/results pages (only the workspace is in scope)
- Real-time collaboration or multi-user access to a workspace
- Automated ACS submission (user submits manually via myimmiAccount)

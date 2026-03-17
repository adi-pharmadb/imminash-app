# Spec Lite: Imminash Beta V1

## What We're Building
AI-powered Australian migration intelligence + skill assessment document prep platform. Two phases, one coherent product. Next.js 15 / Supabase / Claude Sonnet 4.6.

## Phase 1: Migration Intelligence (Free Funnel)
1. **Landing page** with value prop, trust signals, single CTA
2. **7-page stepper** collecting profile data (basics, education, additional quals, work experience, role details, english/languages, final details) with live points counter, session persistence, conditional fields
3. **Analyzing screen** -- 4.8s animated progress while AI matching runs in background
4. **Teaser screen** -- points ring, top 3 occupations, blurred full report preview
5. **Email gate** -- capture lead, unlock full results
6. **Full results dashboard** -- two tabs (Skills Assessment + Employer Sponsored), occupation cards with points gap, possibility rating, pathway signals, state nomination matrix (8 states x 2 visas)

## Phase 2: Document Workspace (Paid -- pricing deferred)
1. **Auth via magic link** (email pre-filled from gate)
2. **Split-panel workspace** -- left: AI chat, right: view-only document preview with tabs per document type
3. **AI guides conversation** using assessing body templates, pre-filled with Phase 1 context
4. **Duty alignment** -- user describes duties in plain language, AI rewrites to match ANZSCO descriptors + body expectations
5. **6 document types** -- Employment Reference (per role), CV, Cover Letter, Statutory Declaration(s), Checklist, Submission Guide
6. **Download** -- PDF + DOCX per document, or ZIP of all; saved to Supabase Storage

## Business Logic (All Rule-Based)
- **Points calculator**: 10 categories, combined experience cap (AU + Offshore max 20, AU prioritized), max 125, min 65 for 189
- **Possibility rating**: High (meets threshold AND MLTSSL), Medium (one of the two), Low (neither)
- **State nominations**: NSW=4-digit unit groups for 190 / 491 closed, VIC=MLTSSL or STSOL, QLD/SA/TAS=ANZSCO code sets, WA=title matching, ACT=all 491 + most 190, NT=closed
- **Employer sponsored**: 186 requires MLTSSL + 3yrs exp, 482 requires CSOL + 1yr exp
- **AI matching**: Claude tool use for structured output, validate against canonical data, keyword bigram fallback

## Database (8 Tables)
leads, profiles, assessments, occupations, state_nominations, invitation_rounds, assessing_body_requirements, documents, conversations

## API Routes
- `POST /api/match-occupations` -- AI occupation matching
- `POST /api/leads` -- email gate save
- `POST /api/assessments` -- save results
- `POST /api/chat` -- streaming AI conversation
- `GET /api/documents/[assessmentId]` -- get documents
- `POST /api/documents/[documentId]/download` -- generate PDF/DOCX
- `POST /api/documents/[assessmentId]/download-all` -- ZIP all
- `POST /api/admin/upload-data` -- CSV data refresh

## Key Constraints
- AI model configurable via AI_MODEL env var
- All critical outputs (points, pathways, state eligibility) are rule-based, never AI-generated
- Documents are view-only in right panel; edits only through chat
- Mobile fully responsive for both phases (Phase 2: vertical stack with chat/docs toggle)
- No em dashes in any user-facing content

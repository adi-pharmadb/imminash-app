# Client Call Feedback — 2026-04-08

Participants: Aditya (founder), Dave (CTO), Kunal (migration agent), Kamen.
Cross-verified against current codebase. Status legend: ✓ done, ❌ not built, ⚠️ partial.

---

## A. Stepper (pre-results) fixes

- [ ] **Offshore experience: add "0 to less than 3 years" band** between "None" and "3 to less than 5". Currently jumps None → 3-5. `src/components/stepper/StepperPage4.tsx:34-39`. Also update `src/lib/points-calculator.ts` to return 0 points for the new band.
- [ ] **Experience dropdown labels: show full text** (e.g. "3 to less than 5 years") not abbreviated "3-5". Both onshore and offshore. `StepperPage4.tsx:26-39`.
- [ ] **English score: split into 4 inputs** (speaking / writing / reading / listening). Ask which test (IELTS / PTE / Other). For PTE ask date (before/after 6 Aug 2025). New PTE superior bands: speaking ≥88, writing ≥85, others ≥79. Free-text "Other" passes raw info to AI. `StepperPage6.tsx:19-60` + `points-calculator.ts:27-38`.
- [x] "Other" visa allows custom text input — `StepperPage1.tsx:135-144`.
- [x] Roles & responsibilities field added.
- [x] Loading screen messages spread across full time.

## B. Results page

- [ ] **Replace numeric match scores with labels.** Strong (>80) / Medium / Weak. Partly done via `getPossibilityRating()` — verify numeric score isn't still shown alongside on `OccupationCard`.
- [ ] **Move "Start Skill Assessment" CTA above the fold.** `results/page.tsx:370-398` is ~35% down the page. Sticky or hoist into first viewport.
- [ ] **Collapsible points breakdown** — collapsed by default, expand arrow.
- [ ] **Collapsible occupation cards** — collapsed by default so CTA stays visible.
- [ ] **TL;DR section inside points/match box** — one-line summary per match.
- [ ] **Fix 189 list data accuracy**: if MLTSSL → always on 189 list. Logic in `visa-pathway-engine.ts:82-100` correct; audit DB data.
- [ ] **Fix state nomination data accuracy** — `state_nominations` table needs audit.
- [ ] **Light-mode accessibility bug**: results table header first row unreadable.
- [ ] **Edit-details flow**: collapsible panel between points breakdown and occupation cards. Edit job title / field of study / roles & responsibilities (ideally full form), then "re-analyze" re-runs matching + points. `ReassessmentTrigger.tsx` currently only captures trigger dates — this is a net new flow.
- [x] **ACS eligibility gate already built** — `src/lib/eligibility-check.ts:10-27` checks PY OR 1yr onshore OR 2+yr offshore and switches CTA between "Prepare skill assessment" and consultation.
- [ ] **Kill / hide the `/pathway` page** — client says no value-add. Remove CTA link in `results/page.tsx`; delete or flag `src/app/pathway/page.tsx`.

## C. Occupation selection

- [ ] **Allow up to 3 occupations** (ACS allows 3 per application). Currently single-select — `OccupationPicker.tsx:34-100`.
- [ ] **Move occupation selection post-paywall**.
- [ ] **SOP task for Kunal**: document the gut-feel shortlisting rules (e.g. state inviting more Software Engineers than Developers) so we can encode them into the matcher/prompt.

## D. Workspace / chat (major rebuild)

- [ ] **Unified single-chat experience**: collapse Phase 1 (free stepper + matching + points) and Phase 2 (paid doc gen) into one chat interface, one URL. Sign-in, payment, everything inside chat.
- [ ] **Three-panel layout**: left = journey steps (dynamic per objective), center = chat, right = documents + form. Left/right panels collapsible. `WorkspaceLayout.tsx` already has 3 zones — left panel needs to become a journey stepper, currently a document list.
- [ ] **Migration agent as 3rd chat participant** (user + AI + agent group chat). Agent tags user or AI; tagging AI triggers re-generation; corrections feed back into AI instructions for learning. `ChatPanel` currently 2-party only.
- [ ] **CV upload: support DOCX** (fails silently today — only PDFs parse). Parse DOCX server-side or convert to PDF before sending to Claude.
- [ ] **Post-CV-upload bug**: AI says "Let me review and ask targeted questions" then asks nothing. Fix in `chat-prompt.ts` + `api/chat/route.ts`.
- [ ] **Prune document tabs.** Keep only: Employment Reference Letter, Document Checklist, Submission Guide. Allow CV download if user provided one. Remove: Supporting Statement, CPD Log, Cover Letter, CV/Resume (as generated doc). Source: `WorkspaceLayout.tsx:63-67` `DEFAULT_NON_REF_DOCS`.
- [ ] **Employment reference letter UI disclaimer**: warn user they must paraphrase to match their actual day-to-day duties, not copy-paste ANZSCO descriptors. Currently only in system prompt (`chat-prompt.ts` rule 7).
- [ ] **Left-panel journey steps (objective-driven)**: Personal details → Suggested occupation → CV → Employer reference → Document checklist → Submission guide. Future: steps change based on objective (skill assessment / PR / student visa / citizenship).
- [ ] **Color tweak** on workspace (confirm specific element with client).

## E. Email / PDF

- [ ] **Send PDF report to gate email.** No email infra today. Pick provider (Resend/Postmark) and wire to gate submit.

## F. Cost / infra

- [x] **Prompt caching on workspace system prompt** — commit `adc5474`.
- [ ] Consider Haiku 4.5 for cheap early turns in workspace chat.
- [ ] Free-phase cost: ~1 Claude call (occupation match) ≈ $0.03–0.07 per user. Dave quoted 7–10¢. Within tolerance; revisit after first real users.

---

## Sprint decision

Aditya and Dave agreed at end of call: **full rebuild path** — unified chat experience incorporating all items in A–E this sprint.

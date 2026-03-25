# Specification: Visa Pathway Tool (Tool 2)

## Goal
Build the Visa Pathway Tool -- the second of three tools in the Imminash platform. This tool takes the output from Tool 1 (matched occupations, points score, user profile) and delivers a personalised visa pathway recommendation: which visa subclass (189, 190, 491, or employer-sponsored) gives the user the best route to PR, with state-specific options, points gap analysis, processing times, timeline to PR, and actionable next steps.

## User Stories
- As a skilled visa applicant who just completed the occupation matcher, I want to see which visa pathway is my strongest option so that I know exactly what to do next.
- As a user with points below the 189 cutoff, I want to understand how the +5 (190) or +15 (491) nomination bonus changes my eligibility and which states I should target.
- As a user whose occupation is on STSOL only, I want to clearly understand that 189 is not available and see my 190/491 options ranked by state.
- As a user approaching age 45, I want urgent warnings about my eligibility window closing so I can act quickly.
- As a non-technical user, I want clear next steps I can follow without needing a migration agent, but with a booking CTA if I want professional help.

## Specific Requirements

### Data Handoff from Tool 1
- Tool 2 is accessed via a new route at `/pathway`
- Data is loaded from `sessionStorage` key `imminash_results` (same source as the results page)
- Required data: `formData` (user profile), `skillsMatches` (top 3 occupations), `employerMatches`, `breakdown` (points), `assessmentId`
- If no session data exists, redirect to `/assessment` with a message
- A prominent CTA on the results page (`/results`) links to `/pathway` as "See Your Visa Pathways"
- The handoff must be seamless -- no re-entry of data

### Visa Pathway Decision Engine (`src/lib/visa-pathway-engine.ts`)
Core logic that evaluates each pathway for each matched occupation:

**Subclass 189 (Skilled Independent)**
- Eligible only if occupation is on MLTSSL
- Compare user's total points vs most recent 189 invitation round cutoff for that ANZSCO code
- Rating logic:
  - "Strong": points >= cutoff AND on MLTSSL
  - "Competitive": points within 5 of cutoff AND on MLTSSL
  - "Gap Exists": points < cutoff by 5+ AND on MLTSSL (show gap amount)
  - "Not Available": occupation not on MLTSSL
- Include latest round date and cutoff from `invitation_rounds` table

**Subclass 190 (State Nominated)**
- Eligible if occupation is on MLTSSL or STSOL
- User's effective points = total + 5 (state nomination bonus)
- Query `state_nominations` table for which states nominate this occupation for 190
- For each nominating state, show availability status
- Rating: based on effective points vs typical state thresholds
- Note: 190 requires living in nominating state for 2 years post-grant

**Subclass 491 (Skilled Work Regional)**
- Eligible if occupation is on MLTSSL, STSOL, or ROL
- User's effective points = total + 15 (regional nomination bonus)
- Query `state_nominations` table for which states nominate for 491
- Flag that 491 is provisional (5 years), leads to 191 PR after 3 years in regional area
- "Regional" = everywhere except Sydney, Melbourne, Brisbane (post-Nov 2019 definition)
- Rating: based on effective points and occupation availability

**Employer Sponsored (482/494/186) -- Backup Pathway**
- Reuse existing `getEmployerEligibility()` from `src/lib/employer-eligibility.ts`
- Show as alternative/backup when points-based routes are weak
- 482: CSOL + 1 year experience + employer sponsor needed
- 494: CSOL + 3 years experience (regional employer)
- 186 Direct Entry: MLTSSL + 3 years AU experience

**Recommended Pathway Selection**
- Algorithm ranks all viable pathways and selects the top recommendation
- Priority: 189 (if Strong) > 190 (if points+5 meets threshold) > 491 (if points+15 meets threshold) > employer-sponsored
- If 189 is "Gap Exists" but 190 bridges the gap, recommend 190 with explanation
- If all points-based routes are weak, recommend employer-sponsored or consultation
- Output: `recommendedPathway` with `visa`, `reasoning`, and `confidence` fields

### Points Gap Analysis (`src/lib/points-gap.ts`)
For each pathway where the user falls short:

- Calculate exact points gap (e.g., "You need 10 more points for 189")
- Generate ranked improvement suggestions based on user's current profile:
  - English improvement: Competent->Proficient (+10) or Proficient->Superior (+10), only if not already at max
  - NAATI/CCL (+5) if not already claimed
  - Professional Year (+5) if not already claimed (note: only available for ACS, accounting, engineering)
  - More Australian work experience (calculate years needed for next bracket)
  - Partner skills assessment (+5 or +10 depending on level)
- Each suggestion includes: action, points gain, feasibility note, estimated timeframe
- For 190: show that +5 state bonus bridges the gap (if applicable)
- For 491: show that +15 regional bonus bridges the gap (if applicable)

### Processing Times & Timeline Data (`src/lib/processing-times.ts`)
- Static configuration file with current DHA processing time estimates:
  - 189: 6-12 months (75% of applications)
  - 190: 6-9 months (varies by state)
  - 491: 6-12 months
  - 482: 1-4 months
  - 186: 6-12 months
- Timeline to PR:
  - 189: Immediate PR on grant
  - 190: PR on grant, but must live in nominating state for 2 years
  - 491: Provisional visa (5 years), eligible for 191 PR after 3 years in regional area
  - 482: Pathway to 186 after 2-3 years with same employer
- Note: Processing times are approximate and sourced from DHA published data. Include a "Last updated" date.

### Edge Case Handling
- **Points below 65**: Cannot apply for any points-tested visa. Show prominent warning, recommend employer-sponsored pathway or further study, and strong agent booking CTA
- **Age 40-44**: Flag urgency -- "Your age points drop significantly. Consider lodging EOI promptly."
- **Age 45+**: Ineligible for 189/190. Only 491 (if under 45 at invite) or employer-sponsored. Major constraint warning.
- **STSOL-only occupation**: No 189 path. Show only 190/491. Make this clear, do not show 189 as an option.
- **ROL-only occupation**: Only 491. Very limited. Flag and recommend agent consultation.
- **Visa expiry within 6 months**: Flag timing risk with current visa details from user profile
- **No Australian experience**: Note that some states (e.g., NSW) may have additional requirements for certain occupations
- **All pathways weak**: Strong agent booking CTA as primary action

### State Availability Integration
- Actually query `state_nominations` table (fix the empty array issue from results page)
- For each occupation, show a state-by-state breakdown for 190 and 491:
  - State name, 190 status (open/closed), 491 status (open/closed), any notes
- Use existing `getStateEligibility()` function from `src/lib/state-nominations.ts` but pass real DB data
- Create an API route `GET /api/state-nominations?anzsco_codes=261313,261312` that returns state nomination data for given ANZSCO codes

### Frontend: `/pathway` Page
New page at `src/app/pathway/page.tsx` with the following sections:

**Header Section**
- Personalised heading: "{firstName}'s Visa Pathway Roadmap"
- Subtext referencing data sources
- Imminash brand header (matching results page pattern)

**Recommended Pathway Banner**
- Highlighted card at the top showing the #1 recommended pathway
- Visa subclass name, 1-2 sentence reasoning, confidence indicator
- Primary CTA button

**Pathway Cards (one per viable pathway)**
Each card contains:
- Visa subclass name and description (e.g., "Subclass 189 - Skilled Independent")
- Possibility rating: Strong / Competitive / Gap Exists / Not Available
- Points comparison: "{userPoints} / {required} points" with visual bar (for 190/491, show effective points with bonus)
- States available (for 190/491): state chips showing which states nominate
- Processing time estimate
- Timeline to PR
- Next steps (bulleted action list)
- Points improvement suggestions (if gap exists)

**Points Gap Section (if applicable)**
- Visual gap analysis showing current points vs requirement
- Ranked improvement actions with points gain and feasibility

**Employer Sponsored Section**
- Show if employer-sponsored is viable as a backup
- Reuse EmployerCard component pattern

**Edge Case Warnings**
- Age warnings, visa expiry warnings, etc. shown as prominent alert banners

**CTAs (sticky bottom bar)**
- Primary: "Start Your Skill Assessment" -> Tool 3 (if ACS body)
- Secondary: "Book a Free Consultation" -> Studynash Calendly URL (placeholder for now, use `https://calendly.com/studynash` as placeholder)
- Show appropriate CTA based on context (ACS vs non-ACS, strong vs weak match)

### Frontend Components to Create
- `src/components/pathway/PathwayCard.tsx` -- Individual visa pathway card
- `src/components/pathway/RecommendedBanner.tsx` -- Top recommendation highlight
- `src/components/pathway/PointsGapAnalysis.tsx` -- Visual gap analysis with improvement suggestions
- `src/components/pathway/StateAvailabilityTable.tsx` -- State-by-state 190/491 breakdown
- `src/components/pathway/EdgeCaseWarning.tsx` -- Warning banner for age, visa expiry, etc.
- `src/components/pathway/PathwayTimeline.tsx` -- Processing time and PR timeline visual

### API Route: State Nominations
- `GET /api/state-nominations?anzsco_codes=261313,261312`
- Returns state nomination data for the requested ANZSCO codes from the `state_nominations` table
- Public access (no auth required, same as occupation data)
- Response shape: `{ nominations: { [anzscoCode: string]: StateNomination[] } }`

### Link from Results Page
- Add a prominent CTA on the results page below the occupation cards: "See Your Visa Pathways" button
- Style as a secondary amber CTA matching the existing design system
- Links to `/pathway`

### Disclaimer
- Include on the pathway page: "This tool provides general information only and does not constitute migration advice. Always consult a registered migration agent (MARA) for personalised advice."
- Style as footer text, matching the landing page disclaimer pattern

## Visual Design
No visual assets provided. Follow existing design system:
- Dark theme with oklch color palette
- Glass-card styling (`glass-card` class)
- Amber glow accents (`glow-amber` class)
- `animate-reveal-up` entrance animations
- `gradient-mesh` background on the page
- Font: `font-display` italic for headings
- Responsive: mobile-first, max-w-3xl container (matching results page)

Pathway rating colors:
- Strong: green `oklch(0.72 0.17 155)`
- Competitive: amber `oklch(0.78 0.12 70)`
- Gap Exists: orange `oklch(0.70 0.15 50)`
- Not Available: muted `oklch(0.40 0.02 260)`

## Existing Code to Leverage

**`src/lib/pathway-signals.ts`** -- Has `getPossibilityRating()` and `getPathwaySignal()`. The pathway engine extends this with more detailed logic, state-specific data, and gap analysis. Keep the existing functions for the results page; the pathway engine is a superset.

**`src/lib/state-nominations.ts`** -- Has `getStateEligibility()` and `getStateInvitingSummary()`. These are the foundation for the state availability section. The key fix is passing real DB data instead of empty arrays.

**`src/lib/employer-eligibility.ts`** -- Has `getEmployerEligibility()` for 186/482 checks. Reuse directly.

**`src/lib/points-calculator.ts`** -- Has `estimatePoints()` and `parseExperienceYears()`. Reuse for points calculations. The gap analysis builds on top of the breakdown it returns.

**`src/app/results/page.tsx`** -- Pattern for loading session data, computing derived state, and rendering cards. The pathway page follows the same pattern.

**`src/components/results/OccupationCard.tsx`** -- Card design pattern to follow for PathwayCard.

## Out of Scope
- Actual Calendly integration (placeholder URL only)
- Payment/Stripe for Tool 3
- Changes to Tool 1 matching logic or points calculator values
- Changes to Tool 3 workspace
- Changes to authentication flow
- Adding new state nomination data beyond what's already seeded
- Real-time invitation round data updates
- Multi-language / i18n support
- Admin panel for pathway configuration
- PDF export of pathway recommendations

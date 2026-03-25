# Task Breakdown: Visa Pathway Tool (Tool 2)

## Overview
Total Tasks: 6 Task Groups, ~35 sub-tasks

## Task List

### Core Logic Layer

#### Task Group 1: Visa Pathway Decision Engine & Supporting Logic
**Dependencies:** None

- [x] 1.0 Complete pathway engine and supporting logic
  - [x] 1.1 Write tests for the pathway engine
    - Test 189 rating: "Strong" when points >= cutoff AND MLTSSL
    - Test 189 rating: "Not Available" when occupation is STSOL only
    - Test 190 effective points include +5 bonus
    - Test 491 effective points include +15 bonus
    - Test recommended pathway selection prioritizes 189 > 190 > 491 > employer
    - Test edge case: points below 65 returns all pathways as weak with consultation recommendation
    - Test edge case: age 45+ returns 189/190 as ineligible
  - [x] 1.2 Create `src/lib/visa-pathway-engine.ts`
    - Define types: `PathwayRating` ("Strong" | "Competitive" | "Gap Exists" | "Not Available"), `PathwayResult`, `PathwayAnalysis`
    - `evaluate189()`: Check MLTSSL status, compare points vs cutoff, return rating + reasoning
    - `evaluate190()`: Check MLTSSL/STSOL, add +5 bonus, check state nominations, return rating + states
    - `evaluate491()`: Check MLTSSL/STSOL/ROL, add +15 bonus, check state nominations, flag provisional status
    - `evaluateEmployerSponsored()`: Reuse `getEmployerEligibility()`, format as pathway result
    - `analyzePathways()`: Orchestrator that runs all evaluations for each matched occupation, selects recommended pathway
    - `selectRecommendedPathway()`: Ranking algorithm -- 189 Strong > 190 viable > 491 viable > employer > consultation
  - [x] 1.3 Create `src/lib/points-gap.ts`
    - `analyzePointsGap()`: Given current breakdown and target points, calculate gap and improvement suggestions
    - Each suggestion: `{ action: string, pointsGain: number, feasibility: "Easy" | "Moderate" | "Hard", timeframe: string, available: boolean }`
    - Check English (can they improve?), NAATI (+5), Professional Year (+5), partner skills (+5/+10), more AU experience
    - Only suggest improvements the user hasn't already maxed out (check current breakdown values)
    - `formatGapSummary()`: Human-readable summary of gap + top 3 suggestions
  - [x] 1.4 Create `src/lib/processing-times.ts`
    - Static config object with DHA processing time estimates per visa subclass
    - `getProcessingTime(visa)`: Returns `{ range: string, typical: string }` (e.g., "6-12 months")
    - `getTimelineToPR(visa)`: Returns description of PR timeline (immediate, 2 years in state, 3 years regional, etc.)
    - `lastUpdated`: Date string for when estimates were last verified
  - [x] 1.5 Create edge case detection utilities in `visa-pathway-engine.ts`
    - `detectEdgeCases()`: Returns array of warning objects
    - Check: points < 65, age 40-44, age 45+, STSOL-only, ROL-only, visa expiry within 6 months
    - Each warning: `{ type: string, severity: "critical" | "warning" | "info", message: string, action: string }`
  - [x] 1.6 Run tests from 1.1, verify all pass

**Acceptance Criteria:**
- All pathway engine tests pass
- 189/190/491/employer evaluations return correct ratings based on list status, points, and state data
- Points gap analysis generates relevant improvement suggestions
- Edge cases detected and warnings generated
- Recommended pathway selection follows correct priority

---

### API Layer

#### Task Group 2: State Nominations API & Data Wiring
**Dependencies:** Task Group 1

- [x] 2.0 Complete API routes and data integration
  - [x] 2.1 Write tests for state nominations API
    - Test `GET /api/state-nominations?anzsco_codes=261313` returns nomination data
    - Test returns empty object for unknown ANZSCO codes
    - Test handles multiple ANZSCO codes comma-separated
  - [x] 2.2 Create `src/app/api/state-nominations/route.ts`
    - `GET` handler accepting `anzsco_codes` query parameter (comma-separated)
    - Query `state_nominations` table for matching ANZSCO codes
    - Group results by ANZSCO code
    - Response: `{ nominations: { [anzscoCode: string]: StateNomination[] } }`
    - Public access, no auth required
    - Graceful error handling (return empty nominations on failure)
  - [x] 2.3 Run tests from 2.1, verify all pass

**Acceptance Criteria:**
- State nominations API returns correct data grouped by ANZSCO code
- Handles multiple codes and missing data gracefully
- No auth required (public reference data)

---

### Frontend -- Pathway Page

#### Task Group 3: Pathway Page & Components
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete pathway page and all components
  - [x] 3.1 Write tests for pathway components
    - Test PathwayCard renders visa name, rating, points comparison, and next steps
    - Test PathwayCard shows "Strong" rating with green styling for 189 when points >= cutoff
    - Test PathwayCard shows "Not Available" with muted styling for 189 when not MLTSSL
    - Test RecommendedBanner renders the top pathway recommendation with reasoning
    - Test PointsGapAnalysis renders gap amount and improvement suggestions
    - Test StateAvailabilityTable renders state-by-state 190/491 breakdown
    - Test EdgeCaseWarning renders age warning for users 40+
    - Test pathway page redirects to /assessment when no session data
  - [x] 3.2 Create `src/components/pathway/PathwayCard.tsx`
    - Props: `pathway: PathwayResult`, `userPoints: number`, `breakdown: PointsBreakdown`
    - Sections: visa name + description, rating badge (Strong/Competitive/Gap/Not Available with colors), points bar (current vs required, showing bonus for 190/491), states available (chips for 190/491), processing time, timeline to PR, next steps list, points improvement suggestions (if gap)
    - Use glass-card styling, animate-reveal-up
    - Rating colors: Strong=green, Competitive=amber, Gap=orange, Not Available=muted
  - [x] 3.3 Create `src/components/pathway/RecommendedBanner.tsx`
    - Props: `pathway: PathwayResult`, `reasoning: string`
    - Highlighted card with amber glow border
    - Shows: "Recommended: Subclass {visa}" + 1-2 sentence reasoning
    - Primary CTA button (context-dependent: Tool 3 or consultation)
  - [x] 3.4 Create `src/components/pathway/PointsGapAnalysis.tsx`
    - Props: `currentPoints: number`, `targetPoints: number`, `suggestions: PointsImprovement[]`
    - Visual points bar showing current vs target
    - Ranked list of improvement actions with points gain, feasibility badge, and timeframe
    - Highlight which suggestions bridge the gap for 190 (+5) or 491 (+15)
  - [x] 3.5 Create `src/components/pathway/StateAvailabilityTable.tsx`
    - Props: `eligibility: StateEligibility[]`, `occupationTitle: string`
    - Table/grid: State | 190 | 491 | Notes
    - Green dot for open, red for closed, dash for N/A
    - Mobile-responsive (stacked cards on small screens)
  - [x] 3.6 Create `src/components/pathway/EdgeCaseWarning.tsx`
    - Props: `warnings: EdgeCaseWarning[]`
    - Renders warning banners with severity-based styling (critical=red, warning=amber, info=blue)
    - Each warning shows message + recommended action
  - [x] 3.7 Create `src/components/pathway/PathwayTimeline.tsx`
    - Props: `visa: string`, `processingTime: ProcessingTimeInfo`, `timelineToPR: string`
    - Visual timeline showing: Application -> Processing -> Grant -> PR (with durations)
    - Different for each visa type (189 immediate PR, 190 with 2yr obligation, 491 provisional->191)
  - [x] 3.8 Create `src/app/pathway/page.tsx`
    - Load data from sessionStorage `imminash_results`
    - If no data, redirect to `/assessment`
    - Fetch state nominations via `GET /api/state-nominations?anzsco_codes=...`
    - Run `analyzePathways()` with real data
    - Run `detectEdgeCases()` for warnings
    - Render sections in order: Header, Edge Case Warnings, Recommended Banner, Pathway Cards (one per viable pathway), Points Gap Analysis (if applicable), Employer Sponsored section
    - Sticky bottom CTA bar: "Start Your Skill Assessment" (ACS) or "Book a Free Consultation" (non-ACS/weak)
    - Include disclaimer footer
    - Responsive layout, max-w-3xl, gradient-mesh background
  - [x] 3.9 Run tests from 3.1, verify all pass

**Acceptance Criteria:**
- All component tests pass
- Pathway page loads data from session and renders all sections
- Redirects to /assessment when no data
- State nominations fetched from API (not empty arrays)
- Recommended pathway highlighted at top
- Points gap analysis shows actionable improvements
- Edge case warnings displayed prominently
- Responsive on mobile
- Disclaimer present
- CTAs work (Tool 3 link or consultation placeholder)

---

### Frontend -- Results Page Integration

#### Task Group 4: Results Page CTA & State Data Fix
**Dependencies:** Task Group 2

- [x] 4.0 Complete results page updates
  - [x] 4.1 Write tests for results page changes
    - Test "See Your Visa Pathways" CTA button renders on results page
    - Test CTA links to /pathway
    - Test state nominations are fetched from API (not empty arrays)
  - [x] 4.2 Add pathway CTA to results page
    - Add "See Your Visa Pathways" button below the occupation cards section
    - Style as prominent secondary CTA with amber accent
    - Links to `/pathway`
    - Position: between the occupation cards and the sticky bottom CTA
  - [x] 4.3 Fix state nomination data on results page
    - Replace the empty array `[] as StateNomination[]` with actual API call to `/api/state-nominations`
    - Fetch state nominations for all matched ANZSCO codes on page load
    - Pass real data to `getStateEligibility()` calls
  - [x] 4.4 Run tests from 4.1, verify all pass

**Acceptance Criteria:**
- Pathway CTA visible and links to /pathway
- State nominations loaded from API on results page (no more empty arrays)
- State nomination matrix now shows real data

---

### Testing & Verification

#### Task Group 5: Integration Tests & Full Verification
**Dependencies:** Task Groups 1-4

- [x] 5.0 Complete testing and verification
  - [x] 5.1 Write integration tests
    - Integration test: full flow from session data -> pathway analysis -> all pathways evaluated correctly
    - Integration test: points gap suggestions are relevant to user's actual profile (don't suggest improvements already maxed)
    - Integration test: state nominations API returns real data and pathway page uses it
    - Integration test: edge cases trigger correct warnings (age 45+, points < 65, STSOL-only)
    - Integration test: recommended pathway changes based on user's points (high points = 189, medium = 190, low = 491)
  - [x] 5.2 Run all feature-specific tests
    - Run ALL tests from Task Groups 1-5
    - Verify TypeScript compilation with `tsc --noEmit`
    - Expected: ~25 tests passing
  - [x] 5.3 Manual browser verification
    - Start dev server, navigate through full flow: assessment stepper -> results -> pathway page
    - Verify pathway page renders all sections correctly
    - Verify state data is real (not empty)
    - Verify responsive layout on mobile viewport
    - Verify all links work (back to results, Tool 3 CTA, consultation CTA)
    - Take screenshots for verification

**Acceptance Criteria:**
- All feature-specific tests pass (~25 tests)
- TypeScript compiles without errors
- Full user flow works in browser: stepper -> results -> pathway
- All sections render with real data
- Responsive on mobile
- No console errors

---

#### Task Group 6: Polish & Edge Cases
**Dependencies:** Task Group 5

- [x] 6.0 Polish and handle remaining edge cases
  - [x] 6.1 Handle loading and error states on pathway page
    - Loading skeleton while fetching state nominations
    - Error state if API calls fail (show pathway analysis without state-specific data)
    - Empty state if no viable pathways exist (strong consultation CTA)
  - [x] 6.2 Add entrance animations
    - Staggered `animate-reveal-up` on pathway cards (matching results page pattern)
    - Smooth transitions on expanding/collapsing sections
  - [x] 6.3 Verify disclaimer text
    - Ensure disclaimer matches client requirements: "does not constitute migration advice, informational only"
    - Ensure no guaranteed outcome language
  - [x] 6.4 Final visual polish
    - Verify color consistency with design system
    - Check spacing, typography hierarchy
    - Ensure glass-card styling and amber accents are consistent
  - [x] 6.5 Final full test run
    - Run all feature tests one more time
    - Browser verification of complete flow

**Acceptance Criteria:**
- Loading/error states handled gracefully
- Animations match existing design system
- Disclaimer present and compliant
- Visual consistency with rest of app
- All tests pass

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Core Logic** -- no dependencies, foundation for everything
2. **Task Group 2: API Layer** -- depends on Group 1 for types
3. **Task Group 3: Pathway Page & Components** -- depends on Groups 1 and 2
4. **Task Group 4: Results Page Integration** -- depends on Group 2 (API route)
5. **Task Group 5: Testing & Verification** -- depends on all groups
6. **Task Group 6: Polish** -- depends on Group 5

**Parallelization opportunities:**
- Groups 3 and 4 can run in parallel (different pages, both depend on Groups 1-2)

## Key Files Reference

### Files to Create
- `src/lib/visa-pathway-engine.ts`
- `src/lib/points-gap.ts`
- `src/lib/processing-times.ts`
- `src/app/api/state-nominations/route.ts`
- `src/app/pathway/page.tsx`
- `src/components/pathway/PathwayCard.tsx`
- `src/components/pathway/RecommendedBanner.tsx`
- `src/components/pathway/PointsGapAnalysis.tsx`
- `src/components/pathway/StateAvailabilityTable.tsx`
- `src/components/pathway/EdgeCaseWarning.tsx`
- `src/components/pathway/PathwayTimeline.tsx`
- `src/__tests__/visa-pathway-engine.test.ts`
- `src/__tests__/points-gap.test.ts`
- `src/__tests__/state-nominations-api.test.ts`
- `src/__tests__/pathway-page.test.ts`

### Files to Modify
- `src/app/results/page.tsx` -- add pathway CTA, fix state nomination data
- `src/lib/state-nominations.ts` -- may need minor extensions for API usage

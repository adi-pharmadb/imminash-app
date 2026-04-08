# Specification: Assessment Flow Fixes (Client Feedback)

## Goal
Fix UX issues, wording accuracy, and routing logic in the pre-payment assessment flow (form, loading screen, results page, email gate) based on direct client feedback.

## Specific Requirements

**1. "Other" Visa Text Input**
- File: `src/components/stepper/StepperPage1.tsx`
- When user selects "Other" from the `visaOptions` dropdown (line 24), show a text input underneath so they can type their visa type
- Store the typed value in a new `visaStatusOther` field on `StepperFormData`
- The text input should only appear when "Other" is selected; hide it otherwise
- Validation: if "Other" is selected, the text input must be non-empty for the page to be valid
- Update `StepperFlow.tsx` page 1 validation (line 46-50) to require `visaStatusOther` when `visaStatus === "Other"`

**Eval:**
- Vitest: page 1 `isValid` returns false when `visaStatus === "Other"` and `visaStatusOther` is empty; returns true when both are set
- Playwright: select "Other" from visa dropdown; verify text input appears; type a visa name; verify Continue button becomes enabled

**2. Scroll to Top on Continue**
- File: `src/components/stepper/StepperFlow.tsx`
- In `handleNext()` (line 177), add `window.scrollTo({ top: 0, behavior: 'instant' })` before advancing the step index
- Also add the same scroll in `handlePrev()` (line 185)

**Eval:**
- Playwright: fill out page 1, click Continue; verify `window.scrollY === 0` on the next page (evaluate JS in browser context)

**3. "2 or more years" Wording**
- File: `src/components/stepper/StepperPage2.tsx`, line 103
- Change `label="Completed 2+ years of study in Australia?"` to `label="Completed 2 or more years of study in Australia?"`
- Also update the hint text on line 104 if it references "2+"

**Eval:**
- Playwright: navigate to step 2, select "Australia" as country; verify the label text contains "2 or more years" and does not contain "2+"

**4. Eligibility Routing Gate**
- File: `src/app/results/page.tsx` (or new utility `src/lib/eligibility-check.ts`)
- Before showing results, check if the user meets at least ONE of these conditions:
  1. Professional Year completed (`formData.professionalYear === "Yes"`)
  2. Australian work experience >= 1 year (`formData.australianExperience` is "1-3", "3-5", "5-8", or "8+" after dropdown update)
  3. Overseas work experience >= 2 years (`formData.experience` is "3-5", "5-8", or "8+" after dropdown update -- note: the new "3 to less than 5" band starts at 3, which is >= 2)
- **Eligible path**: Show results normally. Primary CTA routes to the Document Builder payment page (`/value`) as normal.
- **Ineligible path**: Still show top 3 matched occupations (user deserves to see their matches). But do NOT show the "Prepare my documents" CTA. Instead show a "Next Steps" message explaining they need more experience/qualifications, with a CTA to book a free consultation via `NEXT_PUBLIC_AGENT_BOOKING_URL` env var.
- Add `NEXT_PUBLIC_AGENT_BOOKING_URL` to `.env.example`

**Eval:**
- Vitest: `checkEligibility({ professionalYear: "No", australianExperience: "0", experience: "0" })` returns false; `checkEligibility({ professionalYear: "Yes", ... })` returns true; `checkEligibility({ australianExperience: "1-3", ... })` returns true; `checkEligibility({ experience: "3-5", ... })` returns true
- Playwright: complete form with 0 AU experience, 0 overseas, no professional year; verify results page shows occupations but NOT the payment CTA; verify consultation booking CTA is visible
- Playwright: complete form with 1-3 years AU experience; verify results page shows occupations AND the payment CTA

**5. Australian Work Experience Dropdown - DHA Bands**
- File: `src/components/stepper/StepperPage4.tsx`, lines 26-33
- Replace `auExperienceOptions` with exact DHA points test bands:
  ```
  { value: "0", label: "None" },
  { value: "1-3", label: "1 to less than 3 years" },
  { value: "3-5", label: "3 to less than 5 years" },
  { value: "5-8", label: "5 to less than 8 years" },
  { value: "8+", label: "8 years or more" },
  ```
- Remove the old "Less than 1 year" option (value "0-1"). Users with < 1 year should select "None".
- Check `src/lib/points-calculator.ts` to ensure the points mapping still works with updated values (remove handling for "0-1" if present)

**Eval:**
- Playwright: navigate to step 4, select "Yes" for skilled role; verify AU experience dropdown shows exactly 5 options with the labels above
- Vitest: points calculator returns 0 for "0", 5 for "1-3", 10 for "3-5", 15 for "5-8", 20 for "8+" (or whatever the correct DHA point values are)

**6. Overseas Work Experience Dropdown - DHA Bands + None**
- File: `src/components/stepper/StepperPage4.tsx`, lines 35-41
- Replace `offshoreExperienceOptions` with:
  ```
  { value: "0", label: "None" },
  { value: "3-5", label: "3 to less than 5 years" },
  { value: "5-8", label: "5 to less than 8 years" },
  { value: "8+", label: "8 years or more" },
  ```
- Remove "Less than 1 year" (value "0-1") and "1-3 years" (value "1-3") options
- Note: DHA does not award points for overseas experience under 3 years
- Check `src/lib/points-calculator.ts` to ensure points mapping is updated

**Eval:**
- Playwright: navigate to step 4; verify overseas experience dropdown shows exactly 4 options with the labels above
- Vitest: points calculator returns 0 for "0", correct points for "3-5", "5-8", "8+"

**7. Guiding Prompts Above Roles Text Box**
- File: `src/components/stepper/StepperPage5.tsx`
- Add four guiding questions above the textarea (between the field label and the textarea element):
  1. "What do you do every day?"
  2. "What tools or systems do you use?"
  3. "Who do you work with or report to?"
  4. "What are you responsible for delivering?"
- Style as a compact list with muted text, visually distinct from the main label
- These should appear for working users only (when `workingSkilled` is "Yes" or "Past"), not for "Not yet" users who have their own prompt

**Eval:**
- Playwright: navigate to step 5 (with workingSkilled = "Yes"); verify all 4 guiding questions are visible above the textarea
- Playwright: navigate to step 5 (with workingSkilled = "No"); verify guiding questions are NOT shown

**8. Loading Screen - Spread Messages Across Full Duration**
- File: `src/components/stepper/AnalyzingScreen.tsx`
- Current: 4 messages at 800ms each = 3.2s total animation, then dead time while API call completes
- Fix: Increase to 8-10 personalised messages spread across a longer duration
- The animation should last at minimum 8 seconds (messages appearing every ~1s)
- Additional messages should be personalised using form data. Examples:
  - "Cross-referencing {jobTitle} with ANZSCO task descriptors..."
  - "Checking invitation round history for your top matches..."
  - "Evaluating state nomination pathways..."
  - "Estimating points gap for 189, 190, and 491 visas..."
  - "Comparing your {fieldOfStudy} qualification against ICT and non-ICT pathways..."
  - "Almost there - finalising your personalised report..."
- Messages should continue revealing one-by-one across the full loading time so something is always happening
- The existing skeleton cards and personalisation are good - keep them

**Eval:**
- Playwright: trigger the loading screen; count the number of step messages that appear; verify at least 8 messages are shown
- Playwright: verify messages continue appearing for at least 6 seconds (not all bunched in the first 3 seconds)
- Vitest: `getPersonalisedMessages(formData)` returns at least 8 messages; messages include form data values when available

**9. Match Percentage Labels (ALREADY DONE)**
- `src/components/results/MatchBadge.tsx` already implements confidence tiers: Strong Match (>=75), Medium Match (50-74), Weak Match (<50)
- Client asked for slightly different thresholds: 70+ = Strong, 50-69 = Good, <50 = Weak
- Update `getConfidenceLabel` thresholds: change 75 to 70, change "Medium Match" to "Good Match"
- Update `getConfidenceColor` in `src/lib/occupation-matching.ts` to match the new thresholds if needed

**Eval:**
- Vitest: `getConfidenceLabel(70)` returns "Strong Match"; `getConfidenceLabel(69)` returns "Good Match"; `getConfidenceLabel(49)` returns "Weak Match"
- Playwright: on results page, verify badge text matches the correct tier for the displayed confidence

**10. Match Reason on Occupation Cards (ALREADY DONE)**
- `src/components/results/OccupationCard.tsx` already shows `reasoning` as bullet points (line 74-76, 184-190)
- Verify this is working correctly. If the AI match API sometimes returns empty reasoning, add a fallback sentence.
- If reasoning is empty, show: "Matched based on your {jobTitle} experience and {fieldOfStudy} qualification."

**Eval:**
- Playwright: on results page, verify each occupation card has at least one reasoning sentence visible
- Vitest: if `occupation.reasoning` is empty/null, fallback text is generated using jobTitle and fieldOfStudy

**11. Personalise Email Gate Bullet Points**
- File: `src/components/stepper/EmailGate.tsx`, lines 12-16
- Replace generic `UNLOCK_ITEMS` text with personalised versions using props
- Add `firstName` and `points` as props to EmailGate
- Updated items:
  1. "See exactly where {firstName}'s {points} points came from" (or "See exactly where your {points} points came from")
  2. "Which visa subclass fits your profile best"
  3. "State nominations and next steps tailored to your score"
- Pass firstName and points from the parent component (StepperFlow or assessment page)

**Eval:**
- Playwright: on email gate screen, verify the first bullet point contains the user's actual points number (not generic text)
- Playwright: verify the text does not contain placeholder brackets or "undefined"

**12. Replace Social Proof Placeholder**
- File: `src/components/stepper/EmailGate.tsx`, line 90
- Change `"2,400+ people have already checked their eligibility"` to `"Based on real DHA occupation and invitation data."`

**Eval:**
- Playwright: on email gate screen, verify social proof text contains "Based on real DHA" and does NOT contain "2,400+"

## Files to Modify
- `src/components/stepper/StepperPage1.tsx` - Other visa text input
- `src/components/stepper/StepperPage2.tsx` - "2 or more years" wording
- `src/components/stepper/StepperPage4.tsx` - AU and overseas dropdown options
- `src/components/stepper/StepperPage5.tsx` - Guiding prompts
- `src/components/stepper/StepperFlow.tsx` - Scroll to top, validation for Other visa
- `src/components/stepper/AnalyzingScreen.tsx` - More loading messages
- `src/components/stepper/EmailGate.tsx` - Personalised bullets, social proof text
- `src/components/results/MatchBadge.tsx` - Threshold update (70 not 75)
- `src/components/results/OccupationCard.tsx` - Reasoning fallback
- `src/app/results/page.tsx` - Eligibility routing gate, consultation CTA
- `src/lib/points-calculator.ts` - Updated dropdown value mappings
- `src/types/assessment.ts` - Add `visaStatusOther` field to StepperFormData

## New Files
- `src/lib/eligibility-check.ts` - Eligibility check function

## Out of Scope
- Workspace changes (covered in workspace-ux-uplift spec)
- Payment flow changes
- Results page layout restructure (only adding eligibility gate + consultation CTA)

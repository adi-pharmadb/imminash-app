# Product Roadmap

## Phase 1: Migration Intelligence Engine

**Goal:** Rebuild the core assessment flow -- occupation matching, points calculation, pathway mapping, state nomination
**Success Criteria:** User completes flow and receives accurate occupation matches, points estimate, and pathway signals

### Features

- [ ] Profile input stepper -- collect education, work experience, English, age, partner details `M`
- [ ] Points calculator -- rule-based DHA points engine with all 10 categories and caps `M`
- [ ] AI occupation matching -- match profile to ANZSCO codes using AI with canonical validation `L`
- [ ] Keyword fallback matching -- backup matching when AI is unavailable `S`
- [ ] Pathway mapping -- visa eligibility signals (189/190/491/482/186) from list status + experience `M`
- [ ] State nomination matrix -- eligibility across 8 states using official state occupation lists `M`
- [ ] 189 invitation round data -- historical minimum points for context `S`
- [ ] Teaser results screen -- show matched occupations + points with blurred full report `S`
- [ ] Email gate -- capture lead before unlocking full report `S`
- [ ] Full results dashboard -- detailed points breakdown, occupation cards, pathway signals, state matrix `L`

### Dependencies

- Official occupation data (ANZSCO codes, list assignments, assessing authorities)
- State nomination CSVs (NSW, VIC, QLD, SA, WA, TAS, ACT, NT)
- 189 invitation round history

## Phase 2: Skill Assessment Document Preparation

**Goal:** AI-powered document generation for skill assessment submission
**Success Criteria:** User can generate assessing-body-aligned documents ready for submission or human review

### Features

- [ ] Assessing body requirements database -- criteria for each body (VETASSESS, ACS, Engineers Australia, TRA, etc.) `L`
- [ ] Document generation -- AI-generated employment references, duty statements, cover letters `XL`
- [ ] Duty alignment engine -- match user's actual duties to assessing body's expected duties `L`
- [ ] Gap analysis -- identify shortfalls in qualifications or experience `M`
- [ ] Document editor -- user can review and edit AI-generated documents `M`
- [ ] Payment integration -- charge for document generation package `M`
- [ ] Download/export -- PDF export of generated documents `S`

### Dependencies

- Phase 1 complete (occupation matching determines which assessing body)
- Assessing body requirements research
- Payment provider integration

## Phase 3: Human Review Pipeline

**Goal:** Enable registered migration agents to review AI-generated documents
**Success Criteria:** Migration agent can review, annotate, and approve documents in an admin interface

### Features

- [ ] Admin dashboard -- migration agent review queue `L`
- [ ] Document review interface -- view, annotate, approve/reject documents `M`
- [ ] User notifications -- inform users of review status `S`
- [ ] Feedback loop -- agent corrections improve AI generation over time `M`
- [ ] Tiered pricing -- AI-only vs AI + human review packages `S`

### Dependencies

- Phase 2 document generation complete
- Registered migration agent partnership

## Phase 4: EOI Preparation & Submission Guidance

**Goal:** Guide users through Expression of Interest submission
**Success Criteria:** Users can prepare and understand their EOI with clear next steps

### Features

- [ ] EOI form guidance -- step-by-step walkthrough of the EOI process `M`
- [ ] Points optimization -- suggestions to improve points before submitting `M`
- [ ] Invitation likelihood estimator -- based on historical round data and current points `M`
- [ ] Timeline planner -- estimated timeline from current position to invitation `S`

### Dependencies

- Phases 1-2 complete
- User feedback on demand

## Phase 5: Scale & Enterprise

**Goal:** Support high volume and potential B2B (migration agent tools)
**Success Criteria:** Platform handles thousands of concurrent users, agents can use as a triage tool

### Features

- [ ] Performance optimization -- caching, query optimization `L`
- [ ] Migration agent portal -- bulk client management `XL`
- [ ] Analytics dashboard -- conversion funnel, lead quality metrics `M`
- [ ] API access -- programmatic access for partners `L`

### Dependencies

- Product-market fit confirmed
- Revenue traction

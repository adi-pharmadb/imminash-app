# Spec Requirements: Smart Occupation Matching & Agent Knowledge System

## Initial Description

Upgrade Imminash's occupation matching from a basic AI picker to an agent-intelligence-powered system. Three key areas:

1. **Agent Knowledge Base** - Structured system for migration agent to transfer domain expertise (hacks, hustles, strategic advice per occupation) into the AI pipeline.
2. **Smarter Matching Logic** - Qualification/industry pre-filtering, ANZSCO unit group validation, confidence scoring with reasoning, experience alignment warnings, weak match thresholds.
3. **Enhanced Results Cards** - Confidence % display, "Why it matched" explanations, invitation round data, state availability, agent booking CTAs for non-ACS and weak matches.

## Requirements Discussion

### First Round Questions

**Q1:** How should the agent knowledge base be structured -- static config files/JSON that get loaded at build time, or a database-backed admin panel where the migration agent can add/edit occupation-specific notes through a UI?
**Answer:** Database-backed admin panel with a UI so it's easy to edit. NOT static files.

**Q2:** The occupations table currently has basic fields (ANZSCO code, title, skill level, assessing authority, list booleans, min 189 points). Should we add qualification_level_required, unit_group_description, and industry_keywords directly to this table, or create separate lookup tables?
**Answer:** Yes, add all the new fields (qualification_level_required, unit_group_description, industry_keywords) directly to the occupations table. The ANZSCO 1220.0 First Edition Rev 1 document will be provided in the docs folder of the project.

**Q3:** For the AI validation step, should the matching include the ANZSCO unit group description in the same AI call (so Claude can validate against official duty descriptions), or should we do a separate pre/post-processing step that compares AI results against unit group data?
**Answer:** User wants us to make the best call here. The goal is MAXIMUM ACCURACY -- "blow the client's mind." Use your best judgment on whether to include unit group descriptions in the same AI call or do separate pre/post-processing. Optimize for accuracy above all.

**Q4:** What confidence threshold should trigger the weak match warning and agent booking prompt? I'm thinking 60% or below.
**Answer:** 60% or below = weak match warning + agent booking prompt.

**Q5:** For the agent booking CTA, should we integrate with a specific tool (Calendly, Cal.com) or just link to an external URL? And whose name/brand goes on it -- "Book a consultation with Nish" or more generic?
**Answer:** No Calendly link yet, use a placeholder. IMPORTANT: The migration agent's name is Kunal (NOT Nish -- there is no Nish).

**Q6:** On the results cards, should the match badges (High/Medium/Low) be replaced entirely with confidence percentages, or show both?
**Answer:** Yes, replace High/Medium/Low with confidence percentages (e.g. "87% Match"). Keep green/amber/red color coding mapped to percentage ranges.

**Q7:** For the "states currently inviting" summary on cards -- should this be a condensed list (e.g., "NSW, VIC, QLD + 2 more") or the full state matrix inline? The current spec has the full matrix, but a summary line might improve card scannability.
**Answer:** User agrees with the simplified summary line approach on cards. Use best judgment for the best possible UX. The full StateNominationMatrix can stay as a detailed view.

**Q8:** Should the role details (Page 5 duties textarea) remain optional/skippable, or should we make it mandatory now that it feeds directly into match quality? If mandatory, what's the minimum character count?
**Answer:** Yes, make mandatory with 50 character minimum. Update hint text.

**Q9:** Scope confirmation -- everything discussed is in scope including admin UI for knowledge base, employer-sponsored tab improvements, and all enhancements?
**Answer:** EVERYTHING is in scope. Including admin UI for knowledge base, employer-sponsored tab improvements, everything discussed. The end goal is: Maximum accuracy in occupation matching, best possible user experience ("epic UX"), agent-level intelligence in recommendations.

### Existing Code to Reference

No similar existing features were explicitly identified by the user for reference. However, the following existing codebase paths are relevant based on the V1 spec and project structure:

**Similar Features Identified:**
- Feature: V1 Spec - Path: `/Users/adityadeshpande/Orgs/Imminash/Imminash-beta/.agent-os/specs/2026-03-18-imminash-beta-v1/spec.md`
- Feature: Current AI occupation matching API - Path: `src/app/api/match-occupations/` (existing endpoint to be enhanced)
- Feature: Full Results Dashboard - Path: `src/components/` (existing results cards to be upgraded)
- Feature: Stepper Flow - Path: `src/components/` (Page 5 duties textarea to be made mandatory)
- Feature: ANZSCO Reference Document - Path: `/Users/adityadeshpande/Orgs/Imminash/Imminash-beta/docs/ANZSCO - Australian and New Zealand Standard Classification of Occupations First Edition, Revision 1.pdf`

### Follow-up Questions

No follow-up questions needed. User provided comprehensive answers covering all aspects.

## Visual Assets

### Files Provided:
No visual assets provided. Bash check confirmed no files in the visuals directory.

### Visual Insights:
N/A -- No visual assets to analyze.

## Requirements Summary

### Functional Requirements

**Agent Knowledge Base (Database-Backed Admin Panel)**
- Database table for agent knowledge entries, keyed by occupation (ANZSCO code)
- Admin UI for migration agent Kunal to add/edit occupation-specific notes
- Fields should include: strategic advice, tips/hacks, common pitfalls, recommended approach, custom notes
- Knowledge entries feed into the AI matching pipeline to enrich recommendations
- Easy-to-use CRUD interface -- no technical knowledge required to operate

**Occupations Table Enhancements**
- Add `qualification_level_required` field to occupations table
- Add `unit_group_description` field to occupations table (sourced from ANZSCO 1220.0 document in docs folder)
- Add `industry_keywords` field to occupations table
- Seed/populate these fields from the ANZSCO First Edition Rev 1 PDF in `/docs/`

**Smarter AI Matching Logic**
- Qualification/industry pre-filtering before AI call
- ANZSCO unit group validation against official descriptions
- Confidence scoring with percentage output (not just High/Medium/Low)
- AI reasoning/explanation for why each occupation matched
- Experience alignment warnings when user's experience doesn't align
- Optimize for MAXIMUM ACCURACY -- this is the primary goal
- Best-judgment approach on whether to include unit group descriptions in the AI call or use separate pre/post-processing (goal: accuracy above all)

**Weak Match Handling**
- Confidence threshold: 60% or below triggers weak match warning
- Agent booking CTA appears for weak matches
- Agent booking CTA also appears for non-ACS matches
- CTA text references migration agent "Kunal" (placeholder link for now)

**Enhanced Results Cards**
- Replace High/Medium/Low badges with confidence percentages (e.g., "87% Match")
- Color coding: green/amber/red mapped to percentage ranges
- "Why it matched" explanation text on each card
- Condensed "states currently inviting" summary line on cards (e.g., "NSW, VIC, QLD + 2 more")
- Full StateNominationMatrix remains accessible as a detailed view
- Invitation round data displayed on cards

**Stepper Flow Updates**
- Page 5 (Role Details / duties textarea): Make MANDATORY (no longer skippable)
- Minimum 50 character requirement for duties text
- Update hint text to reflect the importance of detailed duties for match quality

**Employer-Sponsored Tab Improvements**
- Enhance the employer-sponsored tab with the same level of intelligence as skills assessment tab
- Include in the overall UX upgrade

### Reusability Opportunities
- Existing occupation matching API endpoint to be enhanced (not rebuilt from scratch)
- Existing results dashboard components to be upgraded with new badge/card designs
- Existing stepper flow -- only Page 5 needs modification
- V1 spec contains detailed existing logic for points calculator, state nominations, pathway signals that remain unchanged
- ANZSCO PDF already in docs folder for data extraction

### Scope Boundaries

**In Scope:**
- Database-backed agent knowledge base with admin UI
- Occupations table schema enhancements (3 new fields)
- Data population from ANZSCO 1220.0 PDF
- Smarter AI matching with confidence scoring and reasoning
- Pre-filtering logic (qualification/industry)
- ANZSCO unit group validation
- Weak match threshold (<=60%) with agent booking CTA
- Agent booking CTA for non-ACS matches
- Placeholder booking link for migration agent Kunal
- Confidence percentage badges replacing High/Medium/Low
- Green/amber/red color coding for percentage ranges
- "Why it matched" explanations on cards
- Condensed state invitation summary on cards
- Invitation round data on cards
- Mandatory duties textarea (50 char minimum) with updated hint text
- Employer-sponsored tab improvements
- Epic UX throughout all changes

**Out of Scope:**
- Calendly/Cal.com integration (placeholder link only for now)
- Payment integration (still deferred per V1 spec)
- Phase 2 document workspace changes (not part of this spec)
- Changes to points calculator logic (remains as-is)
- Changes to auth flow (remains as-is)

### Technical Considerations
- Tech stack: Next.js 15, App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth + DB + storage), Anthropic SDK (Claude Sonnet)
- ANZSCO reference PDF available at: `/docs/ANZSCO - Australian and New Zealand Standard Classification of Occupations First Edition, Revision 1.pdf` -- needs to be parsed for unit group descriptions and qualification levels
- Database migrations needed for: new occupations table columns, new agent_knowledge table, admin auth/roles
- Admin panel needs simple auth (could leverage existing Supabase auth with admin role check)
- AI prompt engineering is critical -- the matching prompt needs to incorporate agent knowledge, unit group descriptions, and produce confidence scores with reasoning
- The migration agent's name is Kunal -- all references must use this name

# Assessing Body Knowledge — Canonical Schema

Every body's `knowledge.md` MUST conform to this fixed H2 schema. The agent
navigates a body's knowledge base by calling the `lookup_knowledge` tool with
a section name; the server slices the named H2 block out of the active
`knowledge_md` and returns it. Mis-named or missing sections silently fail at
retrieval time, so conformance matters.

## Required sections

```markdown
# <Body Name> — Knowledge Base

## Overview
One paragraph. What this body assesses, who it's for, which visa pathways
end-to-end depend on it.

## Eligibility Rules
Pathways (e.g. General Skills, RPL, CDR, Trades). Minimum qualification,
minimum experience, English requirement. Written as narrative + bullet
checklist. The agent reads this to decide paywall vs. calendly for a given
profile, so be explicit about each pathway's gate.

## Required Documents
Bullet list. For each required document: name, why it's needed, format
requirements (page count, size, signature, notarisation), who signs, and
whether it's mandatory or only for some pathways.

## Letter Template
Canonical structure blocks for reference letters (or equivalent deliverables
— e.g. CDR career episodes, statutory declarations, portfolio statements).
Include: who must sign, what must be asserted, required content blocks, max
length, tone. Agent drafts against these templates.

## Duty Descriptors
ANZSCO-aligned or body-specific duty language the agent should use when
drafting. May be broken into per-occupation sub-sections keyed by ANZSCO
code (###-level). Agent uses these verbatim as starting points for duty
generation.

## Fees & Submission Mechanics
Current fee (with currency + as-of date). Payment method. Portal URL. Max
file sizes. Encryption rules. Expected document bundle format (zip,
individual upload, postal).

## Common Risks & Watchpoints
Things that get applications rejected or delayed. Agent proactively flags
these to the user before they submit. Each risk should be actionable
(something the user can fix).

## Post-Submission Timeline
Typical assessment duration. Communication channel (email, portal, phone).
What to do if asked for more information. Refund policy if withdrawn.

## Sources
Unordered list. Every URL the scraper or the author pulled from, with the
`scraped_at` date (ISO 8601). Sources are the audit trail; if a fact is
asserted elsewhere in the file it MUST trace back to at least one source
here.
```

## Non-negotiable rules

- Section order is fixed. The order above is the order in the file.
- Section titles are fixed — exact spelling, exact case. The `lookup_knowledge`
  tool matches them literally.
- Every body's knowledge file has ALL sections. Empty sections are permitted
  but must still be present with an explicit "Not applicable for this body."
  placeholder so the agent can distinguish "not applicable" from "unknown".
- The H1 is always the body name exactly as stored in
  `assessing_body_requirements.body_name` (so a lookup by body_name can find
  the file).

## Freshness

- `assessing_body_requirements.knowledge_scraped_at` is the canonical "how
  fresh" marker. It's set by the scraper pipeline when a revision is
  promoted.
- `assessing_body_requirements.knowledge_sources` is a jsonb array of
  `{url, scraped_at, status}`. The agent can surface the URL of a source
  to the user if asked "where did you get that?".
- Older revisions live in `assessing_body_knowledge_revisions`. Promotion is
  a manual SQL step after human review of the diff.

## Versioning the schema itself

If the H2 section list changes (e.g. we add a new required section), every
body's knowledge file must be updated at the same time. Don't land the
schema change and the body updates in separate commits — the runtime lookup
will miss sections in unupdated bodies and the agent will start answering
from memory for those sections.

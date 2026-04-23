# Portal Form Schema — Shape

Each body's application portal form is captured as a single YAML file in
`content/portal-schemas/<Body>.yaml`. The Submission Playbook generator
reads these files (via a loader, analogous to `scripts/load-knowledge.ts`)
and turns each step/field into a copy-paste instruction for the user.

## Top level

```yaml
body: ACS
portal_url: https://www.acs.org.au/msa/online-application.html
login_url: https://www.acs.org.au/my-account/login
as_of: 2026-04-23
captured_by: hand-walk-2026-04-23
fee:
  amount_aud: 500
  inc_gst: true
  payment_methods: [credit_card, debit_card]
  cancel_policy: partial refund within 14 days, non-refundable after that
post_submission:
  confirmation_format: "Reference number starts with 'AU'; arrives in portal + email"
  expected_wait: "10 to 12 weeks"
  rfmi_window_days: 28
steps: [...]
```

## Steps

Each step is one logical page or accordion panel in the portal. The
`iterable` flag means the user adds N entries (one per employer,
qualification, etc.) and fills the same field set N times.

```yaml
- id: employment_history            # stable key the generator uses
  title: Employment History
  page_url_fragment: /employment    # optional: appended to portal_url
  iterable: per-employer            # omit for singleton steps
  helper: "Add each employer as a separate entry. ACS assesses each role independently."
  fields: [...]
  uploads: [...]
```

## Fields

Every field has a `key`, a `type`, and a `source` — where the value is
pulled from in the user's `ProjectedConversation`.

```yaml
- key: start_date
  label: "Employment Start Date"           # exact label the portal uses
  type: date                               # text | date | number | email | phone | dropdown | radio | checkbox | textarea
  format: DD/MM/YYYY                       # for date
  required: true
  source: documents.employment_reference[i].period_start
  notes: "First day of employment, not the contract signing date."
```

Supported `source` shapes:

- `profile.<key>` — from `ProjectedConversation.profile`
- `match.<key>` — from `ProjectedConversation.matches[0]` (ANZSCO, title,
  confidence, assessing_authority)
- `points.<key>` — from points breakdown
- `documents.<type>[<index>].<field>` — from drafted documents
- `cv.<key>` — from parsed CV data
- `literal: "..."` — a hardcoded value (e.g. `migration_pathway: literal: "General Skills Assessment"`)
- `computed.<fn_name>` — a function name the generator resolves
  (e.g. `computed.full_name` joins first + last)

For dropdowns:

```yaml
- key: country_of_citizenship
  type: dropdown
  source: profile.citizenship
  options: [Afghanistan, Albania, Algeria, ..., Zimbabwe]
  match: "case-insensitive-exact"      # or fuzzy, prefix, etc.
```

The `options` list is the EXACT list from the portal, in order. The
generator uses this to pick the correct dropdown value when the user's
source string doesn't literally match (e.g. user typed "USA", portal
shows "United States of America").

## Uploads

```yaml
- slot: reference_letter
  label: "Employment Reference Letter"
  accept: pdf
  max_mb: 10
  required: true
  source: documents.employment_reference[i]
  filename_template: "{seq}_Reference_{employer_slug}.pdf"
  notes: "One per employer. Must be on company letterhead."
```

`filename_template` is the filename the user should save the PDF as before
uploading. `{seq}` is an auto-incrementing number starting from the step
order. `{employer_slug}` and similar are slug-safe pulls from the source.

## Declarations (review-and-pay step)

```yaml
fields:
  - key: declarations
    type: checkbox_list
    required_all: true
    items:
      - "I confirm the information provided is true and correct."
      - "I understand the fee is non-refundable after assessment begins."
      - "I consent to ACS verifying my documents with third parties."
```

## Why YAML not JSON

YAML handles long enum lists (countries, qualifications) without quoting
hell, and comments are useful for capturing scraper notes inline. The
loader converts to JSON before persisting to Supabase.

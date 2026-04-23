# Portal schema capture

One YAML schema per assessing body's application portal, stored at
`content/portal-schemas/<Body>.yaml` and conforming to the shape defined
in `content/portal-schemas/SCHEMA.md`.

## How we capture

The portal forms are auth-gated, so public scraping does not work. We
use **Claude in Chrome** (the MCP extension) to drive a logged-in
browser: Adi signs into the body's portal in his Chrome window, I walk
every step of the application form via the `mcp__claude-in-chrome__*`
tools, and I write the captured schema to YAML as I go.

## Per-body capture recipe

1. **Open a test/live account** on the body's portal. Use a disposable
   email if possible; capture the account credentials in a password
   manager (never commit).
2. **Start a fresh application**. Do NOT submit it. Do NOT pay. The goal
   is to walk every page and capture every field, not to file.
3. **For each step/page** in the portal:
   - Capture the page URL fragment
   - Read the page with `mcp__claude-in-chrome__read_page`
   - For every input: label, input type, required flag, source field
   - For dropdowns: capture the EXACT option list in order
   - For file uploads: capture the slot label, accept types, max size
4. **At the declaration/review page**: capture every declaration checkbox
   verbatim (these are legally binding and we must reproduce them word
   for word).
5. **Write YAML** as you go. Do NOT submit the form. Log out when done.

## Tools

The YAML capture is hand-authored via the Chrome MCP tools. There is no
separate Python scraper here — `browser-use` is overkill for a one-off
walkthrough, and the Chrome MCP gives us better visual feedback during
capture.

## Loader

Once a YAML is captured, run:

```
npx tsx scripts/load-portal-schema.ts
```

This reads every YAML in `content/portal-schemas/`, converts to JSON,
and upserts into `assessing_body_requirements.portal_schema` (jsonb column
added in the pending portal-schema migration).

# Assessing body ingestion

One scraper script per assessing body (`acs.py`, `vetassess.py`, ...). Each
script pulls the body's public requirement pages with Scrapling (static
HTML) + browser-use (authenticated or JS-rendered pages), normalises the
output into the fixed H2 schema documented in `docs/knowledge-schema.md`,
and writes an un-promoted revision to `assessing_body_knowledge_revisions`.

## Ops loop (manual, by design)

```
1.  Run a scraper:          python scripts/ingest-body/acs.py
2.  Script prints a diff against the currently-promoted revision and writes
    the new revision un-promoted.
3.  Review the diff. If acceptable:
      update assessing_body_requirements
         set knowledge_md = r.knowledge_md,
             knowledge_scraped_at = r.scraped_at,
             active_revision_id = r.id
         from assessing_body_knowledge_revisions r
         where r.id = '<new_revision_id>'
           and assessing_body_requirements.body_name = 'ACS';
4.  The agent starts using the new revision on the next /api/chat turn.
```

No CI, no cron, no webhook. The goal is deliberate, auditable rollouts,
not auto-ingest. Promotion is a human-in-the-loop step until we have
>3 bodies and stability warrants automation.

## Environment

```
export NEXT_PUBLIC_SUPABASE_URL=https://<imminash-project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Use a venv:

```
cd scripts/ingest-body
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Adding a new body

1. Create `<body>.py` next to `acs.py` using it as a template.
2. Fill in `BODY_NAME`, `SOURCES` (list of `(url, extractor_fn)` pairs), and
   a `main()` that stitches extractor output into the H2 schema via
   `shared.normalize.build_markdown`.
3. Run it, review the diff, promote.

No TypeScript changes should be required to ship a new body. If a new body
needs an application-code change, the architecture has failed and we
should patch that before shipping the body.

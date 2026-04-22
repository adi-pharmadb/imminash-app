"""Write a new knowledge revision to Supabase and print a diff.

New revisions are inserted un-promoted. Promotion is a manual SQL step.
Run this AFTER you've built the markdown with `shared.normalize.build_markdown`.
"""

from __future__ import annotations

import difflib
import hashlib
import os
import sys
from dataclasses import dataclass

from supabase import Client, create_client


def _md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def _client() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
        )
    return create_client(url, key)


@dataclass
class WriteResult:
    revision_id: str | None
    skipped: bool
    reason: str


def write_revision(
    body_name: str,
    knowledge_md: str,
    sources: list[dict] | None = None,
    diff_summary: str | None = None,
) -> WriteResult:
    """Insert a new, un-promoted revision. Skips if content unchanged."""
    client = _client()

    body_resp = (
        client.table("assessing_body_requirements")
        .select("id, knowledge_md")
        .eq("body_name", body_name)
        .maybe_single()
        .execute()
    )
    body = body_resp.data
    if not body:
        return WriteResult(None, True, f"body {body_name!r} not found")

    current = body.get("knowledge_md") or ""
    if current and _md5(current) == _md5(knowledge_md):
        return WriteResult(None, True, "content unchanged from active revision")

    diff = "\n".join(
        difflib.unified_diff(
            current.splitlines(),
            knowledge_md.splitlines(),
            fromfile=f"{body_name} (active)",
            tofile=f"{body_name} (new scrape)",
            lineterm="",
        )
    )
    if diff:
        sys.stdout.write(diff + "\n")

    insert_resp = (
        client.table("assessing_body_knowledge_revisions")
        .insert({
            "body_id": body["id"],
            "knowledge_md": knowledge_md,
            "sources": sources or [],
            "diff_summary": diff_summary or "scraper revision, un-promoted",
        })
        .execute()
    )
    rows = insert_resp.data or []
    if not rows:
        return WriteResult(None, True, "insert returned no row")
    return WriteResult(rows[0]["id"], False, "revision written un-promoted")

"""Shared H2-schema builder for assessing body knowledge files.

The agent depends on section headings matching the schema exactly. Every
body scraper produces a dict keyed by the canonical section names defined
in SCHEMA_SECTIONS below; this module stitches that dict into a single
markdown string in the correct order, with placeholders for any empty
sections so the runtime lookup never gets a 'section missing' surprise.

See docs/knowledge-schema.md for the canonical spec.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Mapping

SCHEMA_SECTIONS: tuple[str, ...] = (
    "Overview",
    "Eligibility Rules",
    "Required Documents",
    "Letter Template",
    "Duty Descriptors",
    "Fees & Submission Mechanics",
    "Common Risks & Watchpoints",
    "Post-Submission Timeline",
    "Sources",
)

EMPTY_PLACEHOLDER = "Not applicable for this body."


def build_markdown(
    body_name: str,
    sections: Mapping[str, str],
    sources: Iterable[tuple[str, str]] | None = None,
) -> str:
    """Build a schema-conformant markdown string.

    Args:
      body_name: Exact `body_name` from assessing_body_requirements.
      sections: Dict keyed by the section names in SCHEMA_SECTIONS. Any
        missing or empty-string value becomes a placeholder line.
      sources: Optional explicit sources list as (url, iso_scraped_at) tuples.
        If provided, overrides any Sources entry in `sections`.

    Returns:
      A full markdown document conforming to docs/knowledge-schema.md.
    """
    lines: list[str] = [f"# {body_name} — Knowledge Base", ""]

    for section in SCHEMA_SECTIONS:
        lines.append(f"## {section}")
        lines.append("")
        if section == "Sources" and sources is not None:
            for url, scraped_at in sources:
                lines.append(f"- {url}  scraped {scraped_at}")
        else:
            body = (sections.get(section) or "").strip()
            lines.append(body if body else EMPTY_PLACEHOLDER)
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def now_iso() -> str:
    """ISO-8601 UTC timestamp suitable for the Sources list."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

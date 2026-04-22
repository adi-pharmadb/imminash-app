"""Scraper for the Australian Computer Society (ACS) knowledge base.

Pulls ACS's public Skills Assessment pages with Scrapling, extracts the
sections the agent needs (eligibility pathways, fees, required documents,
formatting rules, timelines), and emits a schema-conforming markdown
document.

Run: python scripts/ingest-body/acs.py

This is a stub. The selectors below are wired but the extractors return
TODOs for now — fill them in as you iterate against the live site.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from shared.normalize import build_markdown, now_iso
from shared.upload import write_revision

BODY_NAME = "ACS"

SOURCES = [
    "https://www.acs.org.au/msa/skills-assessment-guidelines-for-applicants.html",
    "https://www.acs.org.au/msa/anzsco-code-information-guide.html",
    "https://www.acs.org.au/msa/online-application.html",
    "https://www.acs.org.au/msa/fees-and-processing-times.html",
]


def extract_overview() -> str:
    """Return the Overview section body (no H2 prefix)."""
    # TODO: fetch acs.org.au/msa landing page; extract intro paragraph.
    return (
        "The Australian Computer Society (ACS) is the designated skills "
        "assessing authority for ICT occupations under the Australian skilled "
        "migration program."
    )


def extract_eligibility() -> str:
    # TODO: fetch skills-assessment-guidelines; extract pathway table.
    return "TODO: scrape pathway table from skills-assessment-guidelines."


def extract_required_documents() -> str:
    # TODO: fetch skills-assessment-guidelines; extract document list.
    return "TODO: scrape required documents list."


def extract_letter_template() -> str:
    # TODO: extract from ACS letter format guide.
    return "TODO: scrape reference-letter formatting rules."


def extract_duty_descriptors() -> str:
    # TODO: per-ANZSCO sub-sections from anzsco-code-information-guide.
    return "TODO: scrape ANZSCO descriptors per unit group."


def extract_fees() -> str:
    # TODO: fetch fees-and-processing-times; extract current AUD fee schedule.
    return "TODO: scrape current fee schedule."


def extract_risks() -> str:
    return (
        "TODO: aggregate known rejection reasons from ACS guidance + "
        "case-study notes."
    )


def extract_timeline() -> str:
    # TODO: extract from fees-and-processing-times; freshness matters here.
    return "TODO: scrape current processing times."


def main() -> int:
    sections = {
        "Overview": extract_overview(),
        "Eligibility Rules": extract_eligibility(),
        "Required Documents": extract_required_documents(),
        "Letter Template": extract_letter_template(),
        "Duty Descriptors": extract_duty_descriptors(),
        "Fees & Submission Mechanics": extract_fees(),
        "Common Risks & Watchpoints": extract_risks(),
        "Post-Submission Timeline": extract_timeline(),
    }
    today = now_iso()
    sources = [(url, today) for url in SOURCES]
    md = build_markdown(BODY_NAME, sections, sources=sources)

    result = write_revision(
        BODY_NAME,
        md,
        sources=[{"url": url, "scraped_at": today, "status": "stub"} for url in SOURCES],
        diff_summary="acs.py stub scrape (TODO extractors)",
    )
    if result.skipped:
        print(f"[{BODY_NAME}] {result.reason}")
        return 0
    print(f"[{BODY_NAME}] wrote un-promoted revision {result.revision_id}")
    print(
        "To promote: update assessing_body_requirements set knowledge_md = r.knowledge_md, "
        "knowledge_scraped_at = r.scraped_at, active_revision_id = r.id from "
        "assessing_body_knowledge_revisions r where r.id = "
        f"'{result.revision_id}' and assessing_body_requirements.body_name = "
        f"'{BODY_NAME}';"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

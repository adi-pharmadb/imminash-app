"""Scraper for VETASSESS knowledge base.

VETASSESS assesses 360+ non-ICT occupations across business, health,
trades, education, and more. Each occupation has its own opportunity
page on vetassess.com.au; this scraper aggregates the common rules plus
per-occupation duty descriptors.

Run: python scripts/ingest-body/vetassess.py

Stub — extractors return TODOs. Fill in progressively.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from shared.normalize import build_markdown, now_iso
from shared.upload import write_revision

BODY_NAME = "VETASSESS"

SOURCES = [
    "https://www.vetassess.com.au/skills-assessment-for-migration/general-skilled-migration",
    "https://www.vetassess.com.au/skills-assessment-for-migration/general-skilled-migration/fees",
    "https://www.vetassess.com.au/skills-assessment-for-migration/general-skilled-migration/documents",
]


def extract_overview() -> str:
    return (
        "VETASSESS is the designated skills assessing authority for over 360 "
        "non-ICT occupations under the Australian skilled migration program, "
        "spanning business, health, trades, education, and more."
    )


def extract_eligibility() -> str:
    return "TODO: scrape Skill Level 1-3 pathways + degree/experience matrix."


def extract_required_documents() -> str:
    return "TODO: scrape generic + per-occupation document list."


def extract_letter_template() -> str:
    return "TODO: scrape Statement of Service / employment evidence requirements."


def extract_duty_descriptors() -> str:
    return "TODO: per-ANZSCO sub-sections for high-volume VETASSESS occupations."


def extract_fees() -> str:
    return "TODO: scrape current AUD fee schedule (general skills, priority)."


def extract_risks() -> str:
    return "TODO: common rejection reasons from VETASSESS guidance."


def extract_timeline() -> str:
    return "TODO: scrape published processing times."


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
        diff_summary="vetassess.py stub scrape (TODO extractors)",
    )
    if result.skipped:
        print(f"[{BODY_NAME}] {result.reason}")
        return 0
    print(f"[{BODY_NAME}] wrote un-promoted revision {result.revision_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

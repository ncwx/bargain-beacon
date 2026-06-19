from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

import re


PRODUCT_URL = (
    "https://groceries.morrisons.com/products/"
    "morrisons-quilted-comfort-toilet-tissue-4-rolls/107665563"
)

DEBUG_DIRECTORY = Path(__file__).parent / "debug"
DEBUG_HTML_FILE = DEBUG_DIRECTORY / "morrisons_product.html"


def fetch_product_page(url: str) -> str:
    """Download one Morrisons product page."""

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/149.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-GB,en;q=0.9",
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    print(f"Status: {response.status_code}")
    print(f"Downloaded: {len(response.text):,} characters")

    return response.text


def save_debug_html(html: str) -> None:
    """Save the page so its structure can be inspected locally."""

    DEBUG_DIRECTORY.mkdir(parents=True, exist_ok=True)
    DEBUG_HTML_FILE.write_text(html, encoding="utf-8")

    print(f"Saved HTML to: {DEBUG_HTML_FILE}")


def print_json_ld(soup: BeautifulSoup) -> None:
    """Print structured JSON-LD data embedded in the page."""

    scripts = soup.find_all("script", type="application/ld+json")

    print(f"JSON-LD blocks found: {len(scripts)}")

    for index, script in enumerate(scripts, start=1):
        raw_json = script.string

        if not raw_json:
            continue

        try:
            data: Any = json.loads(raw_json)
        except json.JSONDecodeError:
            print(f"Block {index}: invalid JSON")
            continue

        print(f"\n--- JSON-LD block {index} ---")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:5_000])


def print_specification_candidates(soup: BeautifulSoup) -> None:
    """Print visible page text that may contain product specifications."""

    keywords = (
        "ply",
        "sheet",
        "roll",
        "width",
        "length",
        "dimensions",
        "toilet tissue",
    )

    matches: list[str] = []
    seen: set[str] = set()

    for text in soup.stripped_strings:
        cleaned_text = " ".join(text.split())
        lowered_text = cleaned_text.casefold()

        if not any(keyword in lowered_text for keyword in keywords):
            continue

        if cleaned_text in seen:
            continue

        seen.add(cleaned_text)
        matches.append(cleaned_text)

    print("\n--- Possible specification text ---")

    for match in matches[:100]:
        print(match)

def extract_toilet_roll_specs(soup: BeautifulSoup) -> dict[str, int | float | None]:
    """Extract toilet-roll specifications from visible Morrisons page text."""

    page_text = " ".join(soup.stripped_strings)

    rolls_match = re.search(
        r"(\d+)\s*rolls?",
        page_text,
        flags=re.IGNORECASE,
    )

    ply_match = re.search(
        r"(\d+)\s*ply",
        page_text,
        flags=re.IGNORECASE,
    )

    sheets_match = re.search(
        r"(\d+)\s*sheets?\s*per\s*roll",
        page_text,
        flags=re.IGNORECASE,
    )

    dimensions_match = re.search(
        r"sheet\s*size\s*(\d+(?:\.\d+)?)\s*mm\s*x\s*(\d+(?:\.\d+)?)\s*mm",
        page_text,
        flags=re.IGNORECASE,
    )

    total_area_match = re.search(
        r"total\s*area\s*(\d+(?:\.\d+)?)\s*m2",
        page_text,
        flags=re.IGNORECASE,
    )

    rolls_per_pack = int(rolls_match.group(1)) if rolls_match else None
    ply = int(ply_match.group(1)) if ply_match else None
    sheets_per_roll = int(sheets_match.group(1)) if sheets_match else None

    sheet_width_mm = (
        float(dimensions_match.group(1))
        if dimensions_match
        else None
    )

    sheet_length_mm = (
        float(dimensions_match.group(2))
        if dimensions_match
        else None
    )

    total_area_m2 = (
        float(total_area_match.group(1))
        if total_area_match
        else None
    )

    total_sheets = (
        rolls_per_pack * sheets_per_roll
        if rolls_per_pack is not None and sheets_per_roll is not None
        else None
    )

    sheet_area_m2 = (
        (sheet_width_mm / 1000) * (sheet_length_mm / 1000)
        if sheet_width_mm is not None and sheet_length_mm is not None
        else None
    )

    return {
        "rolls_per_pack": rolls_per_pack,
        "ply": ply,
        "sheets_per_roll": sheets_per_roll,
        "total_sheets": total_sheets,
        "sheet_width_mm": sheet_width_mm,
        "sheet_length_mm": sheet_length_mm,
        "sheet_area_m2": sheet_area_m2,
        "total_area_m2": total_area_m2,
    }


def inspect_page(html: str) -> None:
    """Display useful information about the downloaded page."""

    soup = BeautifulSoup(html, "html.parser")

    page_title = soup.title.get_text(strip=True) if soup.title else None
    heading = soup.find("h1")

    print(f"Page title: {page_title}")
    print(
        "Main heading:",
        heading.get_text(" ", strip=True) if heading else "not found",
    )

    print_json_ld(soup)
    print_specification_candidates(soup)

    specifications = extract_toilet_roll_specs(soup)

    print("\n--- Extracted specifications ---")
    print(json.dumps(specifications, indent=2))


def main() -> None:
    try:
        html = fetch_product_page(PRODUCT_URL)
        save_debug_html(html)
        inspect_page(html)

    except requests.RequestException as error:
        print(f"Could not download product page: {error}")
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup


PRODUCT_URL = (
    "https://www.ocado.com/products/"
    "ocado-luxury-quilted-toilet-tissue-307866011"
)

DEBUG_DIRECTORY = Path(__file__).parent / "debug"
DEBUG_HTML_FILE = DEBUG_DIRECTORY / "ocado_product.html"


def fetch_product_page(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/149.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,image/avif,"
            "image/webp,*/*;q=0.8"
        ),
        "Accept-Language": "en-GB,en;q=0.9",
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=30,
        allow_redirects=True,
    )

    print(f"Status: {response.status_code}")
    print(f"Final URL: {response.url}")
    print(
        "Content type:",
        response.headers.get("content-type"),
    )
    print(
        f"Downloaded: "
        f"{len(response.text):,} characters"
    )


    return response.text


def inspect_page(html: str) -> None:
    soup = BeautifulSoup(html, "html.parser")

    page_title = (
        soup.title.get_text(" ", strip=True)
        if soup.title
        else None
    )

    heading = soup.find("h1")

    print(f"Page title: {page_title}")
    print(
        "Main heading:",
        heading.get_text(" ", strip=True)
        if heading
        else "not found",
    )

    scripts = soup.find_all(
        "script",
        type="application/ld+json",
    )

    print(
        f"JSON-LD blocks found: "
        f"{len(scripts)}"
    )

    for index, script in enumerate(
        scripts,
        start=1,
    ):
        raw_json = script.string

        if not raw_json:
            continue

        try:
            data: Any = json.loads(raw_json)
        except json.JSONDecodeError:
            print(
                f"JSON-LD block {index}: "
                f"invalid JSON"
            )
            continue

        print(
            f"\n--- JSON-LD block "
            f"{index} ---"
        )

        print(
            json.dumps(
                data,
                indent=2,
                ensure_ascii=False,
            )[:5_000]
        )

    keywords = (
        "ply",
        "sheet",
        "roll",
        "price",
        "clubcard",
        "rating",
        "review",
    )

    matches: list[str] = []
    seen: set[str] = set()

    for text in soup.stripped_strings:
        cleaned = " ".join(text.split())
        lowered = cleaned.casefold()

        if not any(
            keyword in lowered
            for keyword in keywords
        ):
            continue

        if cleaned in seen:
            continue

        seen.add(cleaned)
        matches.append(cleaned)

    print(
        "\n--- Possible product data ---"
    )

    for match in matches[:150]:
        print(match)


def main() -> None:
    try:
        html = fetch_product_page(
            PRODUCT_URL
        )

        DEBUG_DIRECTORY.mkdir(
            parents=True,
            exist_ok=True,
        )

        DEBUG_HTML_FILE.write_text(
            html,
            encoding="utf-8",
        )

        print(
            f"Saved HTML to: "
            f"{DEBUG_HTML_FILE}"
        )

        inspect_page(html)

    except requests.RequestException as error:
        print(
            f"Could not download Ocado "
            f"product page: {error}"
        )

        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
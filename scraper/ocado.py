from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import requests
from bs4 import BeautifulSoup


PRODUCT_URLS = [
    (
        "https://www.ocado.com/products/"
        "ocado-luxury-quilted-toilet-tissue/307866011"
    ),
    (
        "https://www.ocado.com/products/"
        "ocado-luxury-coconut-oil-toilet-tissue/395152011"
    ),
    (
        "https://www.ocado.com/products/"
        "andrex-complete-clean-toilet-roll/343916011"
    ),
    (
        "https://www.ocado.com/products/"
        "nicky-elite-3-ply-quilted-toilet-tissue/202821011"
    ),
    (
        "https://www.ocado.com/products/"
        "velvet-classic-quilted-toilet-rolls/520831011"
    ),
    (
        "https://www.ocado.com/products/"
        "cushelle-quilted-toilet-rolls-50-more-sheets/400501011"
    ),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/149.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-GB,en;q=0.9",
}

REQUIRED_PLY: int | None = 3


def fetch_product_page(url: str) -> str:
    """Download one Ocado product page."""

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30,
    )

    response.raise_for_status()

    return response.text


def find_product_json_ld(
    soup: BeautifulSoup,
) -> dict[str, Any]:
    """Return the Product JSON-LD object."""

    scripts = soup.find_all(
        "script",
        type="application/ld+json",
    )

    for script in scripts:
        raw_json = script.string

        if not raw_json:
            continue

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            continue

        candidates = (
            data
            if isinstance(data, list)
            else [data]
        )

        for candidate in candidates:
            if not isinstance(
                candidate,
                dict,
            ):
                continue

            item_type = candidate.get(
                "@type"
            )

            if item_type == "Product":
                return candidate

            if (
                isinstance(item_type, list)
                and "Product" in item_type
            ):
                return candidate

    raise ValueError(
        "No Product JSON-LD data was found"
    )


def extract_description_text(
    product_data: dict[str, Any],
) -> str:
    """Convert the HTML description into plain text."""

    description = str(
        product_data.get("description")
        or ""
    )

    description_soup = BeautifulSoup(
        description,
        "html.parser",
    )

    return description_soup.get_text(
        " ",
        strip=True,
    )


def extract_toilet_roll_specs(
    soup: BeautifulSoup,
    product_data: dict[str, Any],
) -> dict[str, Any]:
    """Extract specifications from JSON-LD and the full product page."""

    description = extract_description_text(
        product_data
    )

    page_text = " ".join(
        soup.stripped_strings
    )

    product_name = str(
        product_data.get("name") or ""
    )

    pack_size = str(
        product_data.get("size") or ""
    )

    specification_text = " ".join(
        [
            product_name,
            pack_size,
            description,
            page_text,
        ]
    )

    rolls_match = re.search(
        r"(\d+)\s*rolls?",
        specification_text,
        flags=re.IGNORECASE,
    )

    if not rolls_match:
        rolls_match = re.search(
            r"(\d+)\s*per\s*pack",
            specification_text,
            flags=re.IGNORECASE,
        )

    ply_values = {
        int(value)
        for value in re.findall(
            r"\b(\d+)\s*ply\b",
            specification_text,
            flags=re.IGNORECASE,
        )
    }

    ply_values.update(
        int(value)
        for value in re.findall(
            r"\bply\s*:\s*(\d+)\b",
            specification_text,
            flags=re.IGNORECASE,
        )
    )

    sheet_values = {
        int(value)
        for value in re.findall(
            (
                r"\b(\d+)\s*sheets?"
                r"\s*per\s*roll\b"
            ),
            specification_text,
            flags=re.IGNORECASE,
        )
    }

    sheet_values.update(
        int(value)
        for value in re.findall(
            r"\bsheets?\s*:\s*(\d+)\b",
            specification_text,
            flags=re.IGNORECASE,
        )
    )

    rolls_per_pack = (
        int(rolls_match.group(1))
        if rolls_match
        else None
    )

    ply_conflict = len(ply_values) > 1
    sheets_conflict = len(sheet_values) > 1

    ply = (
        next(iter(ply_values))
        if len(ply_values) == 1
        else None
    )

    sheets_per_roll = (
        next(iter(sheet_values))
        if len(sheet_values) == 1
        else None
    )

    total_sheets = (
        rolls_per_pack * sheets_per_roll
        if rolls_per_pack is not None
        and sheets_per_roll is not None
        else None
    )

    return {
        "rolls_per_pack": rolls_per_pack,
        "ply": ply,
        "sheets_per_roll": sheets_per_roll,
        "total_sheets": total_sheets,
        "sheet_width_mm": None,
        "sheet_length_mm": None,
        "sheet_area_m2": None,
        "total_area_m2": None,
        "ply_conflict": ply_conflict,
        "ply_candidates": sorted(ply_values),
        "sheets_conflict": sheets_conflict,
        "sheet_candidates": sorted(sheet_values),
    }


def assess_specifications(
    specifications:
        dict[str, Any],
) -> tuple[str, str, str | None]:
    """Assess whether the listing is comparable."""

    rolls = specifications[
        "rolls_per_pack"
    ]

    ply = specifications["ply"]

    sheets_per_roll = specifications[
        "sheets_per_roll"
    ]

    if specifications.get("ply_conflict"):
        include_status = "review_conflicting_ply"
        data_confidence = "low"

    elif specifications.get("sheets_conflict"):
        include_status = "review_conflicting_sheet_count"
        data_confidence = "low"

    elif rolls is None:
        include_status = (
            "review_missing_pack_size"
        )
        data_confidence = "low"

    elif sheets_per_roll is None:
        include_status = (
            "review_missing_sheet_count"
        )
        data_confidence = "low"

    elif ply is None:
        include_status = (
            "review_missing_ply"
        )
        data_confidence = "medium"

    elif (
        REQUIRED_PLY is not None
        and ply != REQUIRED_PLY
    ):
        include_status = (
            f"exclude_non_{REQUIRED_PLY}_ply"
        )
        data_confidence = "medium"

    else:
        include_status = "include"
        data_confidence = "medium"

    total_sheets_source = (
        "calculated from retailer roll and sheet counts"
        if specifications[
            "total_sheets"
        ] is not None
        else None
    )

    return (
        include_status,
        data_confidence,
        total_sheets_source,
    )


def calculate_unit_prices(
    price: float,
    specifications:
        dict[str, int | float | None],
) -> dict[str, float | None]:
    """Calculate useful comparison values."""

    rolls = specifications[
        "rolls_per_pack"
    ]

    total_sheets = specifications[
        "total_sheets"
    ]

    price_per_roll = (
        price / rolls
        if isinstance(rolls, int)
        and rolls > 0
        else None
    )

    price_per_100_sheets = (
        price / total_sheets * 100
        if isinstance(total_sheets, int)
        and total_sheets > 0
        else None
    )

    return {
        "price_per_roll": (
            round(price_per_roll, 4)
            if price_per_roll
            is not None
            else None
        ),
        "price_per_100_sheets": (
            round(
                price_per_100_sheets,
                4,
            )
            if price_per_100_sheets
            is not None
            else None
        ),
        "price_per_m2": None,
    }


def normalise_brand(
    brand_data: Any,
) -> str | None:
    """Handle either text or object brand data."""

    if isinstance(brand_data, dict):
        name = brand_data.get("name")

        return (
            str(name)
            if name is not None
            else None
        )

    if brand_data is None:
        return None

    return str(brand_data)


def scrape_product(
    url: str,
) -> dict[str, Any]:
    """Scrape and normalise one Ocado product."""

    checked_at = datetime.now(
        timezone.utc
    ).isoformat()

    html = fetch_product_page(url)

    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    try:
    product_data = find_product_json_ld(
        soup
    )
except ValueError as error:
    page_title = (
        soup.title.get_text(
            " ",
            strip=True,
        )
        if soup.title
        else "no title"
    )

    page_preview = " ".join(
        soup.stripped_strings
    )[:300]

    raise ValueError(
        f"{error}. "
        f"Page title: {page_title!r}. "
        f"Downloaded: {len(html):,} characters. "
        f"Preview: {page_preview!r}"
    ) from error

    product_name = str(
        product_data.get("name") or ""
    )

    specifications = (
        extract_toilet_roll_specs(
            soup,
            product_data
        )
    )

    (
        include_status,
        data_confidence,
        total_sheets_source,
    ) = assess_specifications(
        specifications
    )

    offers = (
        product_data.get("offers")
        or {}
    )

    if isinstance(offers, list):
        offers = (
            offers[0]
            if offers
            else {}
        )

    rating_data = (
        product_data.get(
            "aggregateRating"
        )
        or {}
    )

    price = float(offers["price"])

    availability = str(
        offers.get("availability", "")
    )

    images = (
        product_data.get("image")
        or []
    )

    if isinstance(images, str):
        image_url = images
    else:
        image_url = (
            images[0]
            if images
            else None
        )

    unit_prices = (
        calculate_unit_prices(
            price=price,
            specifications=
                specifications,
        )
    )

    return {
        "date_checked":
            checked_at,
        "retailer":
            "Ocado",
        "retailer_product_id":
            str(
                product_data.get(
                    "sku",
                    "",
                )
            ),
        "product_name":
            product_name,
        "brand":
            normalise_brand(
                product_data.get(
                    "brand"
                )
            ),
        "url":
            url,
        "image_url":
            image_url,
        "pack_price":
            price,
        "member_price":
            None,
        "effective_price":
            price,
        "delivery_mode":
            "online grocery",
        "delivery_fee":
            None,
        "small_order_charge":
            None,
        "delivered_price":
            None,
        **specifications,
        **unit_prices,
        "rating": (
            float(
                rating_data[
                    "ratingValue"
                ]
            )
            if rating_data.get(
                "ratingValue"
            ) is not None
            else None
        ),
        "review_count": (
            int(
                rating_data[
                    "ratingCount"
                ]
            )
            if rating_data.get(
                "ratingCount"
            ) is not None
            else None
        ),
        "in_stock":
            availability.endswith(
                "InStock"
            ),
        "delivery_available":
            True,
        "total_sheets_source":
            total_sheets_source,
        "data_confidence":
            data_confidence,
        "include_status":
            include_status,
        "last_verified":
            checked_at,
    }


def main() -> None:
    for url in PRODUCT_URLS:
        print(f"Scraping: {url}")

        try:
            product = scrape_product(
                url
            )

        except (
            requests.RequestException,
            ValueError,
            KeyError,
            TypeError,
        ) as error:
            print(f"FAILED: {error}")
            continue

        print(
            json.dumps(
                product,
                indent=2,
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
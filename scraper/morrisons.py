from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import requests
from bs4 import BeautifulSoup


PRODUCT_URLS = [
    "https://groceries.morrisons.com/products/morrisons-quilted-comfort-toilet-tissue-4-rolls/107665563",
    "https://groceries.morrisons.com/products/morrisons-toilet-tissue-white-9-rolls/106634562",
    "https://groceries.morrisons.com/products/regina-soft-bamboo-toilet-tissue-9-rolls/113349031",
    "https://groceries.morrisons.com/products/cushelle-seriously-clean-tubeless-toilet-roll-12-rolls-50-more-sheets/114014347",
    "https://groceries.morrisons.com/products/fizz-creations-father-s-day-jokes-toilet-roll/115724885",
    "https://groceries.morrisons.com/products/elegance-gentle-quilted-toilet-paper-24-pack/113348943",
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

NOVELTY_TERMS = (
    "jokes toilet roll",
    "novelty toilet roll",
    "christmas toilet roll",
    "birthday toilet roll",
)


def fetch_product_page(url: str) -> str:
    """Download a Morrisons product page."""

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30,
    )

    response.raise_for_status()

    return response.text


def find_product_json_ld(soup: BeautifulSoup) -> dict[str, Any]:
    """Find the Product JSON-LD object embedded in the page."""

    scripts = soup.find_all("script", type="application/ld+json")

    for script in scripts:
        raw_json = script.string

        if not raw_json:
            continue

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            continue

        candidates = data if isinstance(data, list) else [data]

        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue

            item_type = candidate.get("@type")

            if item_type == "Product":
                return candidate

            if isinstance(item_type, list) and "Product" in item_type:
                return candidate

    raise ValueError("No Product JSON-LD data was found")


def extract_toilet_roll_specs(
    soup: BeautifulSoup,
) -> dict[str, int | float | None]:
    """Extract toilet-paper measurements from visible product text."""

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
        (
            r"sheet\s*size\s*"
            r"(\d+(?:\.\d+)?)\s*mm\s*[x×]\s*"
            r"(\d+(?:\.\d+)?)\s*mm"
        ),
        page_text,
        flags=re.IGNORECASE,
    )

    total_area_match = re.search(
        r"total\s*area\s*(\d+(?:\.\d+)?)\s*m(?:2|²)",
        page_text,
        flags=re.IGNORECASE,
    )

    rolls_per_pack = int(rolls_match.group(1)) if rolls_match else None
    ply = int(ply_match.group(1)) if ply_match else None

    sheets_per_roll = (
        int(sheets_match.group(1))
        if sheets_match
        else None
    )

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
        if rolls_per_pack is not None
        and sheets_per_roll is not None
        else None
    )

    sheet_area_m2 = (
        (sheet_width_mm / 1000) * (sheet_length_mm / 1000)
        if sheet_width_mm is not None
        and sheet_length_mm is not None
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

def assess_specifications(
    product_name: str,
    specifications: dict[str, int | float | None],
) -> tuple[
    dict[str, int | float | None],
    str,
    str,
    str | None,
]:
    """Complete derivable fields and assess whether a product is comparable."""

    completed = specifications.copy()

    total_sheets = completed["total_sheets"]
    sheet_area_m2 = completed["sheet_area_m2"]
    total_area_m2 = completed["total_area_m2"]

    if (
        total_area_m2 is None
        and isinstance(total_sheets, int)
        and total_sheets > 0
        and isinstance(sheet_area_m2, (int, float))
        and sheet_area_m2 > 0
    ):
        completed["total_area_m2"] = round(
            total_sheets * sheet_area_m2,
            4,
        )

    lowered_name = product_name.casefold()

    is_novelty = any(
        term in lowered_name
        for term in NOVELTY_TERMS
    )

    rolls = completed["rolls_per_pack"]
    ply = completed["ply"]
    sheets_per_roll = completed["sheets_per_roll"]
    completed_area = completed["total_area_m2"]

    if is_novelty:
        include_status = "exclude_non_comparable"
        data_confidence = "low"

    elif rolls is None:
        include_status = "review_missing_pack_size"
        data_confidence = "low"

    elif sheets_per_roll is None:
        include_status = "review_missing_sheet_count"
        data_confidence = "low"

    elif ply is None:
        include_status = "review_missing_ply"
        data_confidence = "medium"

    elif REQUIRED_PLY is not None and ply != REQUIRED_PLY:
        include_status = f"exclude_non_{REQUIRED_PLY}_ply"
        data_confidence = (
            "high"
            if completed_area is not None
            else "medium"
        )

    else:
        include_status = "include"
        data_confidence = (
            "high"
            if completed_area is not None
            else "medium"
        )

    total_sheets_source = (
        "calculated from retailer roll and sheet counts"
        if completed["total_sheets"] is not None
        else None
    )

    return (
        completed,
        include_status,
        data_confidence,
        total_sheets_source,
    )


def calculate_unit_prices(
    price: float,
    specifications: dict[str, int | float | None],
) -> dict[str, float | None]:
    """Calculate comparable unit prices."""

    rolls = specifications["rolls_per_pack"]
    total_sheets = specifications["total_sheets"]
    total_area_m2 = specifications["total_area_m2"]

    price_per_roll = (
        price / rolls
        if isinstance(rolls, int) and rolls > 0
        else None
    )

    price_per_100_sheets = (
        price / total_sheets * 100
        if isinstance(total_sheets, int) and total_sheets > 0
        else None
    )

    price_per_m2 = (
        price / total_area_m2
        if isinstance(total_area_m2, (int, float))
        and total_area_m2 > 0
        else None
    )

    return {
        "price_per_roll": (
            round(price_per_roll, 4)
            if price_per_roll is not None
            else None
        ),
        "price_per_100_sheets": (
            round(price_per_100_sheets, 4)
            if price_per_100_sheets is not None
            else None
        ),
        "price_per_m2": (
            round(price_per_m2, 4)
            if price_per_m2 is not None
            else None
        ),
    }


def scrape_product(url: str) -> dict[str, Any]:
    """Scrape and normalise one Morrisons product."""

    checked_at = datetime.now(timezone.utc).isoformat()

    html = fetch_product_page(url)
    soup = BeautifulSoup(html, "html.parser")

    product_data = find_product_json_ld(soup)

    product_name = str(product_data.get("name") or "")

    raw_specifications = extract_toilet_roll_specs(soup)

    (
        specifications,
        include_status,
        data_confidence,
        total_sheets_source,
    ) = assess_specifications(
        product_name=product_name,
        specifications=raw_specifications,
    )

    offers = product_data.get("offers") or {}

    if isinstance(offers, list):
        offers = offers[0] if offers else {}

    rating_data = product_data.get("aggregateRating") or {}

    price = float(offers["price"])
    availability = str(offers.get("availability", ""))

    images = product_data.get("image") or []

    if isinstance(images, str):
        image_url = images
    else:
        image_url = images[0] if images else None

    unit_prices = calculate_unit_prices(
        price=price,
        specifications=specifications,
    )

    return {
        "date_checked": checked_at,
        "retailer": "Morrisons",
        "retailer_product_id": str(product_data.get("sku", "")),
        "product_name": product_name,
        "brand": product_data.get("brand"),
        "url": url,
        "image_url": image_url,
        "pack_price": price,
        "member_price": None,
        "effective_price": price,
        "delivery_mode": "online grocery",
        "delivery_fee": None,
        "small_order_charge": None,
        "delivered_price": None,
        **specifications,
        **unit_prices,
        "rating": (
            float(rating_data["ratingValue"])
            if rating_data.get("ratingValue") is not None
            else None
        ),
        "review_count": (
            int(rating_data["ratingCount"])
            if rating_data.get("ratingCount") is not None
            else None
        ),
        "in_stock": availability.endswith("InStock"),
        "delivery_available": None,
        "total_sheets_source": total_sheets_source,
        "data_confidence": data_confidence,
        "include_status": include_status,
        "last_verified": checked_at,
    }


def main() -> None:
    products: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    for url in PRODUCT_URLS:
        print(f"Scraping: {url}")

        try:
            product = scrape_product(url)
        except (
            requests.RequestException,
            ValueError,
            KeyError,
            TypeError,
        ) as error:
            print(f"FAILED: {error}")

            failures.append(
                {
                    "url": url,
                    "error": str(error),
                }
            )
            continue

        products.append(product)

        print(
            f"OK: {product['product_name']} "
            f"[{product['include_status']}]"
        )

    output = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "retailer": "Morrisons",
        "successful_count": len(products),
        "failure_count": len(failures),
        "products": products,
        "failures": failures,
    }

    output_path = "morrisons_results.json"

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False,
        )

    included_count = sum(
        product["include_status"] == "include"
        for product in products
    )

    review_count = sum(
        str(product["include_status"]).startswith("review_")
        for product in products
    )

    excluded_count = (
        len(products)
        - included_count
        - review_count
    )

    print("\n--- Scan summary ---")
    print(f"Successful: {len(products)}")
    print(f"Included: {included_count}")
    print(f"Needs review: {review_count}")
    print(f"Excluded: {excluded_count}")
    print(f"Failed: {len(failures)}")
    print(f"Saved to: {output_path}")

    
if __name__ == "__main__":
    main()
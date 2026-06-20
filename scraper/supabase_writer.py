from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from urllib.parse import urlsplit, urlunsplit


ENV_FILE = Path(__file__).resolve().parent / ".env"


def create_supabase_client() -> Client:
    """Create a Supabase client using private scraper credentials."""

    load_dotenv(ENV_FILE)

    supabase_url = os.getenv("SUPABASE_URL")
    secret_key = os.getenv("SUPABASE_SECRET_KEY")

    if not supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is missing from scraper/.env"
        )

    if not secret_key:
        raise RuntimeError(
            "SUPABASE_SECRET_KEY is missing from scraper/.env"
        )

    return create_client(
        supabase_url,
        secret_key,
    )


def get_retailer_id(
    client: Client,
    retailer_name: str,
) -> str:
    """Retrieve a retailer UUID using its name."""

    response = (
        client.table("retailers")
        .select("id")
        .eq("name", retailer_name)
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise ValueError(
            f"Retailer not found: {retailer_name}"
        )

    return str(rows[0]["id"])


def build_product_row(
    product: dict[str, Any],
    retailer_id: str,
) -> dict[str, Any]:
    """Map a scraper record to the products table."""

    retailer_product_id = str(
        product.get("retailer_product_id") or ""
    ).strip()

    if not retailer_product_id:
        raise ValueError(
            "Scraped product has no retailer_product_id"
        )

    return {
        "retailer_id": retailer_id,
        "retailer_product_id": retailer_product_id,
        "product_name": product["product_name"],
        "brand": product.get("brand"),
        "url": product.get("url"),
        "image_url": product.get("image_url"),
        "ply": product.get("ply"),
        "rolls_per_pack": product.get(
            "rolls_per_pack"
        ),
        "sheets_per_roll": product.get(
            "sheets_per_roll"
        ),
        "total_sheets": product.get(
            "total_sheets"
        ),
        "sheet_width_mm": product.get(
            "sheet_width_mm"
        ),
        "sheet_length_mm": product.get(
            "sheet_length_mm"
        ),
        "sheet_area_m2": product.get(
            "sheet_area_m2"
        ),
        "total_area_m2": product.get(
            "total_area_m2"
        ),
        "rating": product.get("rating"),
        "review_count": product.get(
            "review_count"
        ),
        "total_sheets_source": product.get(
            "total_sheets_source"
        ),
        "data_confidence": product.get(
            "data_confidence"
        ),
        "include_status": product.get(
            "include_status"
        ),
        "updated_at": product.get(
            "last_verified"
        ),
    }


def normalise_product_url(
    url: str | None,
) -> str | None:
    """Remove tracking parameters and normalise a product URL."""

    if not url:
        return None

    parts = urlsplit(url.strip())

    path = parts.path.rstrip("/") or "/"

    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower(),
            path,
            "",
            "",
        )
    )


def find_existing_product_id(
    client: Client,
    retailer_id: str,
    retailer_product_id: str,
    url: str | None,
) -> str | None:
    """Find an existing product using its stable retailer ID."""

    response = (
        client.table("products")
        .select("id")
        .eq("retailer_id", retailer_id)
        .eq(
            "retailer_product_id",
            retailer_product_id,
        )
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if rows:
        return str(rows[0]["id"])

    # this allows an older URL-only database row to be
    # upgraded with its retailer product ID
    if url:
        url_response = (
            client.table("products")
            .select("id")
            .eq("url", url)
            .limit(1)
            .execute()
        )

        url_rows = url_response.data or []

        if url_rows:
            return str(url_rows[0]["id"])

        canonical_url = normalise_product_url(url)

    if canonical_url:
        candidate_response = (
            client.table("products")
            .select("id, url")
            .eq("retailer_id", retailer_id)
            .execute()
        )

        for row in candidate_response.data or []:
            existing_url = normalise_product_url(
                row.get("url")
            )

            if existing_url == canonical_url:
                return str(row["id"])
                
    return None


def save_product(
    client: Client,
    product: dict[str, Any],
    retailer_id: str,
) -> str:
    """Insert a new product or update its existing row."""

    product_row = build_product_row(
        product=product,
        retailer_id=retailer_id,
    )

    existing_product_id = find_existing_product_id(
        client=client,
        retailer_id=retailer_id,
        retailer_product_id=product_row[
            "retailer_product_id"
        ],
        url=product_row["url"],
    )

    if existing_product_id:
        response = (
            client.table("products")
            .update(product_row)
            .eq("id", existing_product_id)
            .select("id")
            .execute()
        )
    else:
        response = (
            client.table("products")
            .insert(product_row)
            .select("id")
            .execute()
        )

    rows = response.data or []

    if not rows:
        raise RuntimeError(
            "Supabase did not return a product ID"
        )

    return str(rows[0]["id"])


def insert_price_check(
    client: Client,
    product: dict[str, Any],
    product_id: str,
) -> str:
    """Insert one historical price observation."""

    price = product.get("effective_price")

    if not isinstance(price, (int, float)):
        raise ValueError(
            "Scraped product has no valid effective price"
        )

    price_check_row = {
        "product_id": product_id,
        "price": price,
        "delivery_fee": product.get(
            "delivery_fee"
        ),
        "small_order_charge": product.get(
            "small_order_charge"
        ),
        "in_stock": product.get("in_stock"),
        "delivery_available": product.get(
            "delivery_available"
        ),
        "checked_at": product.get(
            "date_checked"
        ),
    }

    response = (
        client.table("price_checks")
        .insert(price_check_row)
        .select("id")
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise RuntimeError(
            "Supabase did not return a price-check ID"
        )

    return str(rows[0]["id"])


def write_scraped_product(
    client: Client,
    product: dict[str, Any],
) -> tuple[str, str]:
    """Save one scraped product and its latest price check."""

    retailer_name = str(product["retailer"])

    retailer_id = get_retailer_id(
        client=client,
        retailer_name=retailer_name,
    )

    product_id = save_product(
        client=client,
        product=product,
        retailer_id=retailer_id,
    )

    price_check_id = insert_price_check(
        client=client,
        product=product,
        product_id=product_id,
    )

    return product_id, price_check_id
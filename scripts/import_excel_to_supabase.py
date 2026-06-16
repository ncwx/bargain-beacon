import os
import math
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_PATH = "data/plyspy_tracker.xlsx"
SHEET_NAME = "Listings"


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    return value


def to_bool(value):
    value = clean(value)
    if value is None:
        return None
    return str(value).strip().lower() == "yes"


def to_float(value):
    value = clean(value)
    if value is None or value == "":
        return None
    return float(str(value).replace("£", "").strip())


def to_int(value):
    value = clean(value)
    if value is None or value == "":
        return None
    return int(float(value))


df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)

for _, row in df.iterrows():
    retailer_name = clean(row.get("retailer"))
    product_name = clean(row.get("product_name"))

    if not retailer_name or not product_name:
        continue

    retailer_result = (
        supabase.table("retailers")
        .select("id")
        .eq("name", retailer_name)
        .execute()
    )

    if retailer_result.data:
        retailer_id = retailer_result.data[0]["id"]
    else:
        inserted = (
            supabase.table("retailers")
            .insert({"name": retailer_name})
            .execute()
        )
        retailer_id = inserted.data[0]["id"]

    product_payload = {
        "retailer_id": retailer_id,
        "product_name": product_name,
        "brand": clean(row.get("brand")),
        "url": clean(row.get("url")),
        "ply": to_int(row.get("ply")) or 3,
        "rolls_per_pack": to_int(row.get("rolls_per_pack")),
        "sheets_per_roll": to_int(row.get("sheets_per_roll")),
        "total_sheets": to_int(row.get("total_sheets")),
        "rating": to_float(row.get("rating")),
        "review_count": to_int(row.get("review_count")),
    }

    # Upsert by URL if available; otherwise insert.
    if product_payload["url"]:
        product_result = (
            supabase.table("products")
            .upsert(product_payload, on_conflict="url")
            .execute()
        )
    else:
        product_result = (
            supabase.table("products")
            .insert(product_payload)
            .execute()
        )

    product_id = product_result.data[0]["id"]

    price_payload = {
        "product_id": product_id,
        "price": to_float(row.get("effective_price")),
        "delivery_fee": to_float(row.get("delivery_fee")) or 0,
        "small_order_charge": to_float(row.get("small_order_charge")) or 0,
        "in_stock": to_bool(row.get("in_stock")),
        "delivery_available": to_bool(row.get("delivery_available")),
    }

    if price_payload["price"] is not None:
        supabase.table("price_checks").insert(price_payload).execute()

print("Import complete.")
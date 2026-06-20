from __future__ import annotations

from ocado import PRODUCT_URLS, scrape_product
from supabase_writer import (
    create_supabase_client,
    write_scraped_product,
)


def main() -> None:
    product = scrape_product(
        PRODUCT_URLS[0]
    )

    print(
        f"Scraped: "
        f"{product['product_name']}"
    )

    client = create_supabase_client()

    product_id, price_check_id = (
        write_scraped_product(
            client=client,
            product=product,
        )
    )

    print("Supabase write successful")
    print(f"Product ID: {product_id}")
    print(
        f"Price-check ID: "
        f"{price_check_id}"
    )


if __name__ == "__main__":
    main()
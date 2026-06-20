from __future__ import annotations

import time
from typing import Any

from ocado import PRODUCT_URLS, scrape_product
from supabase_writer import (
    create_supabase_client,
    write_scraped_product,
)


REQUEST_DELAY_SECONDS = 1


def main() -> None:
    client = create_supabase_client()

    successes: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    total_products = len(PRODUCT_URLS)

    for index, url in enumerate(
        PRODUCT_URLS,
        start=1,
    ):
        print(
            f"\n[{index}/{total_products}] "
            f"Scraping: {url}"
        )

        try:
            product = scrape_product(url)

            print(
                f"Scraped: "
                f"{product['product_name']}"
            )

            print(
                f"Status: "
                f"{product['include_status']}"
            )

            product_id, price_check_id = (
                write_scraped_product(
                    client=client,
                    product=product,
                )
            )

        except Exception as error:
            print(f"FAILED: {error}")

            failures.append(
                {
                    "url": url,
                    "error": str(error),
                }
            )

        else:
            print("Supabase write successful")
            print(f"Product ID: {product_id}")
            print(
                f"Price-check ID: "
                f"{price_check_id}"
            )

            successes.append(
                {
                    "url": url,
                    "product_name": str(
                        product["product_name"]
                    ),
                    "include_status": str(
                        product[
                            "include_status"
                        ]
                    ),
                    "product_id": product_id,
                    "price_check_id":
                        price_check_id,
                }
            )

        if index < total_products:
            time.sleep(
                REQUEST_DELAY_SECONDS
            )

    included_count = sum(
        result["include_status"] == "include"
        for result in successes
    )

    review_count = sum(
        result["include_status"].startswith(
            "review_"
        )
        for result in successes
    )

    excluded_count = (
        len(successes)
        - included_count
        - review_count
    )

    print("\n==============================")
    print("Ocado batch complete")
    print("==============================")
    print(f"URLs attempted: {total_products}")
    print(f"Written successfully: {len(successes)}")
    print(f"Included: {included_count}")
    print(f"Needs review: {review_count}")
    print(f"Excluded: {excluded_count}")
    print(f"Failed: {len(failures)}")

    if failures:
        print("\nFailures:")

        for failure in failures:
            print(
                f"- {failure['url']}: "
                f"{failure['error']}"
            )

        raise SystemExit(1)


if __name__ == "__main__":
    main()
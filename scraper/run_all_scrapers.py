from __future__ import annotations

import argparse
import time
from collections.abc import Callable, Sequence
from typing import Any

from supabase import Client

from morrisons import (
    PRODUCT_URLS as MORRISONS_PRODUCT_URLS,
)
from morrisons import (
    scrape_product as scrape_morrisons_product,
)
from ocado import (
    PRODUCT_URLS as OCADO_PRODUCT_URLS,
)
from ocado import (
    scrape_product as scrape_ocado_product,
)
from supabase_writer import (
    create_supabase_client,
    write_scraped_product,
)


ScraperFunction = Callable[
    [str],
    dict[str, Any],
]

REQUEST_DELAY_SECONDS = 1
RETAILER_DELAY_SECONDS = 2


RETAILER_SCRAPERS: dict[
    str,
    tuple[
        str,
        Sequence[str],
        ScraperFunction,
    ],
] = {
    "morrisons": (
        "Morrisons",
        MORRISONS_PRODUCT_URLS,
        scrape_morrisons_product,
    ),
    "ocado": (
        "Ocado",
        OCADO_PRODUCT_URLS,
        scrape_ocado_product,
    ),
}


def parse_arguments() -> argparse.Namespace:
    """Read command-line options."""

    parser = argparse.ArgumentParser(
        description=(
            "Scrape configured retailers and "
            "write product checks to Supabase."
        ),
    )

    parser.add_argument(
        "--retailer",
        choices=[
            "all",
            *RETAILER_SCRAPERS.keys(),
        ],
        default="all",
        help=(
            "Run every retailer or only one "
            "configured retailer."
        ),
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Scrape and validate products "
            "without writing to Supabase."
        ),
    )

    return parser.parse_args()


def run_retailer(
    *,
    retailer_name: str,
    product_urls: Sequence[str],
    scraper_function: ScraperFunction,
    client: Client | None,
    dry_run: bool,
) -> dict[str, Any]:
    """Run one retailer and return its summary."""

    successes: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    total_products = len(product_urls)

    print("\n================================")
    print(f"Starting {retailer_name}")
    print("================================")

    for index, url in enumerate(
        product_urls,
        start=1,
    ):
        print(
            f"\n[{index}/{total_products}] "
            f"Scraping: {url}"
        )

        try:
            product = scraper_function(url)

            product_name = str(
                product["product_name"]
            )

            include_status = str(
                product["include_status"]
            )

            print(f"Scraped: {product_name}")
            print(f"Status: {include_status}")

            product_id: str | None = None
            price_check_id: str | None = None

            if dry_run:
                print(
                    "Dry run: database write skipped"
                )
            else:
                if client is None:
                    raise RuntimeError(
                        "Supabase client is unavailable"
                    )

                (
                    product_id,
                    price_check_id,
                ) = write_scraped_product(
                    client=client,
                    product=product,
                )

                print(
                    "Supabase write successful"
                )
                print(
                    f"Product ID: {product_id}"
                )
                print(
                    "Price-check ID: "
                    f"{price_check_id}"
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
            successes.append(
                {
                    "url": url,
                    "product_name":
                        product_name,
                    "include_status":
                        include_status,
                    "product_id":
                        product_id,
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

    print("\n--------------------------------")
    print(f"{retailer_name} complete")
    print("--------------------------------")
    print(f"URLs attempted: {total_products}")
    print(
        f"Successful: {len(successes)}"
    )
    print(f"Included: {included_count}")
    print(f"Needs review: {review_count}")
    print(f"Excluded: {excluded_count}")
    print(f"Failed: {len(failures)}")

    return {
        "retailer": retailer_name,
        "attempted": total_products,
        "successful": len(successes),
        "included": included_count,
        "review": review_count,
        "excluded": excluded_count,
        "failed": len(failures),
        "failures": failures,
    }


def main() -> None:
    arguments = parse_arguments()

    if arguments.retailer == "all":
        selected_scrapers = list(
            RETAILER_SCRAPERS.values()
        )
    else:
        selected_scrapers = [
            RETAILER_SCRAPERS[
                arguments.retailer
            ]
        ]

    client = (
        None
        if arguments.dry_run
        else create_supabase_client()
    )

    summaries: list[dict[str, Any]] = []

    for index, (
        retailer_name,
        product_urls,
        scraper_function,
    ) in enumerate(selected_scrapers):
        summary = run_retailer(
            retailer_name=retailer_name,
            product_urls=product_urls,
            scraper_function=
                scraper_function,
            client=client,
            dry_run=arguments.dry_run,
        )

        summaries.append(summary)

        if index < len(selected_scrapers) - 1:
            time.sleep(
                RETAILER_DELAY_SECONDS
            )

    total_attempted = sum(
        summary["attempted"]
        for summary in summaries
    )

    total_successful = sum(
        summary["successful"]
        for summary in summaries
    )

    total_included = sum(
        summary["included"]
        for summary in summaries
    )

    total_review = sum(
        summary["review"]
        for summary in summaries
    )

    total_excluded = sum(
        summary["excluded"]
        for summary in summaries
    )

    total_failed = sum(
        summary["failed"]
        for summary in summaries
    )

    print("\n================================")
    print("All scraper runs complete")
    print("================================")
    print(f"URLs attempted: {total_attempted}")
    print(f"Successful: {total_successful}")
    print(f"Included: {total_included}")
    print(f"Needs review: {total_review}")
    print(f"Excluded: {total_excluded}")
    print(f"Failed: {total_failed}")

    if arguments.dry_run:
        print("Mode: dry run")

    if total_failed:
        print("\nFailures:")

        for summary in summaries:
            for failure in summary["failures"]:
                print(
                    f"- {summary['retailer']}: "
                    f"{failure['url']} — "
                    f"{failure['error']}"
                )

        raise SystemExit(1)


if __name__ == "__main__":
    main()
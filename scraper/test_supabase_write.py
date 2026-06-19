from morrisons import PRODUCT_URLS, scrape_product
from supabase_writer import (
    create_supabase_client,
    write_scraped_product,
)


def main() -> None:
    client = create_supabase_client()

    print("Scraping one test product...")

    product = scrape_product(PRODUCT_URLS[0])

    print(
        f"Scraped: {product['product_name']}"
    )

    product_id, price_check_id = (
        write_scraped_product(
            client=client,
            product=product,
        )
    )

    print("Supabase write successful")
    print(f"Product ID: {product_id}")
    print(
        f"Price-check ID: {price_check_id}"
    )


if __name__ == "__main__":
    main()
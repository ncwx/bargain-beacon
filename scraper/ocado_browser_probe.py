from __future__ import annotations

from playwright.sync_api import (
    TimeoutError as PlaywrightTimeoutError,
)
from playwright.sync_api import sync_playwright


PRODUCT_URL = (
    "https://www.ocado.com/products/"
    "ocado-luxury-quilted-toilet-tissue-307866011"
)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/149.0.0.0 Safari/537.36"
)


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
        )

        context = browser.new_context(
            locale="en-GB",
            user_agent=USER_AGENT,
            extra_http_headers={
                "Accept-Language":
                    "en-GB,en;q=0.9",
            },
        )

        page = context.new_page()

        response = page.goto(
            PRODUCT_URL,
            wait_until="domcontentloaded",
            timeout=60_000,
        )

        try:
            page.wait_for_selector(
                'script[type="application/ld+json"]',
                state="attached",
                timeout=30_000,
            )
        except PlaywrightTimeoutError:
            print(
                "Timed out waiting for JSON-LD"
            )

        html = page.content()

        heading = page.locator("h1").first

        heading_text = (
            heading.inner_text()
            if heading.count() > 0
            else "not found"
        )

        json_ld_count = page.locator(
            'script[type="application/ld+json"]'
        ).count()

        print(
            "Status:",
            response.status
            if response
            else "no response",
        )
        print("Final URL:", page.url)
        print("Page title:", page.title())
        print("Main heading:", heading_text)
        print(
            "Downloaded:",
            f"{len(html):,} characters",
        )
        print(
            "JSON-LD blocks found:",
            json_ld_count,
        )

        context.close()
        browser.close()

        if json_ld_count == 0:
            raise RuntimeError(
                "Ocado still did not expose JSON-LD "
                "after JavaScript execution"
            )


if __name__ == "__main__":
    main()
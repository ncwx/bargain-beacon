import ProductFilters from "@/app/components/ProductFilters";
import SearchBar from "@/app/components/SearchBar";
import { calculateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

type DatabaseNumber = number | string;

type OneOrMany<T> = T | T[] | null;

type RetailerRow = {
  name: string;
};

type ProductRow = {
  id: string;
  product_name: string;
  brand: string | null;
  url: string | null;
  ply: number | null;
  rolls_per_pack: number | null;
  sheets_per_roll: number | null;
  total_sheets: number | null;
  rating: DatabaseNumber | null;
  review_count: number | null;
  retailers: OneOrMany<RetailerRow>;
};

type PriceCheckRow = {
  id: string;
  price: DatabaseNumber;
  delivery_fee: DatabaseNumber | null;
  small_order_charge: DatabaseNumber | null;
  in_stock: boolean | null;
  delivery_available: boolean | null;
  checked_at: string;
  products: OneOrMany<ProductRow>;
};

type HomeProps = {
  searchParams: Promise<{
    q?: string | string[];
    retailer?: string | string[];
    brand?: string | string[];
    sort?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    stock?: string | string[];
    delivery?: string | string[];
  }>;
};

function unwrapRelation<T>(
  relation: OneOrMany<T>,
): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function toNullableNumber(
  value:
    | DatabaseNumber
    | null
    | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function calculateDisplayScore(
  rawScore: number,
  bestRawScore: number,
): number {
  if (
    rawScore <= 0 ||
    bestRawScore <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (bestRawScore / rawScore) * 100,
      ),
    ),
  );
}

export default async function Home({
  searchParams,
}: HomeProps) {
  const resolvedSearchParams =
    await searchParams;

  const query =
    typeof resolvedSearchParams.q ===
    "string"
      ? resolvedSearchParams.q
          .trim()
          .toLowerCase()
      : "";

  const selectedRetailer =
    typeof resolvedSearchParams.retailer ===
    "string"
      ? resolvedSearchParams.retailer
      : "";

  const selectedBrand =
    typeof resolvedSearchParams.brand ===
    "string"
      ? resolvedSearchParams.brand
      : "";

  const selectedSort =
    typeof resolvedSearchParams.sort ===
    "string"
      ? resolvedSearchParams.sort
      : "value";

  const inStockOnly =
    resolvedSearchParams.stock !== "all";

  const deliveryOnly =
    resolvedSearchParams.delivery !==
    "all";

  const minPriceParam =
    typeof resolvedSearchParams.minPrice ===
    "string"
      ? Number(
          resolvedSearchParams.minPrice,
        )
      : null;

  const maxPriceParam =
    typeof resolvedSearchParams.maxPrice ===
    "string"
      ? Number(
          resolvedSearchParams.maxPrice,
        )
      : null;

  const { data, error } = await supabase
    .from("price_checks")
    .select(`
      id,
      price,
      delivery_fee,
      small_order_charge,
      in_stock,
      delivery_available,
      checked_at,
      products (
        id,
        product_name,
        brand,
        url,
        ply,
        rolls_per_pack,
        sheets_per_roll,
        total_sheets,
        rating,
        review_count,
        retailers (
          name
        )
      )
    `);

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--bb-background)] p-8 text-base text-[var(--bb-text-primary)]">
        <p className="bb-interface-text">
          Error loading products:{" "}
          {error.message}
        </p>
      </main>
    );
  }

  const priceChecks = (
    data ?? []
  ) as unknown as PriceCheckRow[];

  const ranked = priceChecks
    .flatMap((row) => {
      const product = unwrapRelation(
        row.products,
      );

      if (
        !product ||
        product.ply !== 3
      ) {
        return [];
      }

      const price = toNullableNumber(
        row.price,
      );

      const rating = toNullableNumber(
        product.rating,
      );

      const deliveryFee =
        toNullableNumber(
          row.delivery_fee,
        );

      const smallOrderCharge =
        toNullableNumber(
          row.small_order_charge,
        );

      if (price === null) {
        return [];
      }

      const score = calculateScore({
        price,
        rolls_per_pack:
          product.rolls_per_pack,
        sheets_per_roll:
          product.sheets_per_roll,
        delivery_fee: deliveryFee,
        small_order_charge:
          smallOrderCharge,
        rating,
        review_count:
          product.review_count,
      });

      if (!score) {
        return [];
      }

      const retailer = unwrapRelation(
        product.retailers,
      );

      return [
        {
          id: row.id,
          productName:
            product.product_name,
          brand: product.brand,
          retailer:
            retailer?.name ?? "Unknown",
          url: product.url,
          price,
          rating,
          reviewCount:
            product.review_count,
          checkedAt: row.checked_at,
          inStock: row.in_stock === true,
          deliveryAvailable:
            row.delivery_available ===
            true,
          rollsPerPack:
            product.rolls_per_pack,
          score,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.score.adjustedValueScore -
        b.score.adjustedValueScore,
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  const deliveredPrices = ranked.map(
    (row) =>
      row.score.deliveredPrice,
  );

  const priceRangeMin =
    deliveredPrices.length > 0
      ? Math.floor(
          Math.min(...deliveredPrices),
        )
      : 0;

  const priceRangeMax =
    deliveredPrices.length > 0
      ? Math.max(
          priceRangeMin + 1,
          Math.ceil(
            Math.max(
              ...deliveredPrices,
            ),
          ),
        )
      : 1;

  const selectedMinPrice =
    minPriceParam !== null &&
    Number.isFinite(minPriceParam)
      ? Math.max(
          priceRangeMin,
          Math.min(
            minPriceParam,
            priceRangeMax - 1,
          ),
        )
      : priceRangeMin;

  const selectedMaxPrice =
    maxPriceParam !== null &&
    Number.isFinite(maxPriceParam)
      ? Math.min(
          priceRangeMax,
          Math.max(
            maxPriceParam,
            selectedMinPrice + 1,
          ),
        )
      : priceRangeMax;

  const retailerOptions = Array.from(
    new Set(
      ranked.map(
        (row) => row.retailer,
      ),
    ),
  ).sort((a, b) =>
    a.localeCompare(b),
  );

  const brandOptions = Array.from(
    new Set(
      ranked
        .map((row) => row.brand)
        .filter(
          (
            brand,
          ): brand is string =>
            Boolean(brand),
        ),
    ),
  ).sort((a, b) =>
    a.localeCompare(b),
  );

  const filteredRanked =
    ranked.filter((row) => {
      const searchableText = [
        row.productName,
        row.brand,
        row.retailer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      const matchesRetailer =
        !selectedRetailer ||
        row.retailer ===
          selectedRetailer;

      const matchesBrand =
        !selectedBrand ||
        row.brand === selectedBrand;

      const matchesPriceRange =
        row.score.deliveredPrice >=
          selectedMinPrice &&
        row.score.deliveredPrice <=
          selectedMaxPrice;

      const matchesStock =
        !inStockOnly || row.inStock;

      const matchesDelivery =
        !deliveryOnly ||
        row.deliveryAvailable;

      return (
        matchesSearch &&
        matchesRetailer &&
        matchesBrand &&
        matchesPriceRange &&
        matchesStock &&
        matchesDelivery
      );
    });

  const sortedRanked = [
    ...filteredRanked,
  ].sort((a, b) => {
    switch (selectedSort) {
      case "price-low":
        return (
          a.score.deliveredPrice -
            b.score.deliveredPrice ||
          a.rank - b.rank
        );

      case "sheets-high":
        return (
          b.score.totalSheets -
            a.score.totalSheets ||
          a.rank - b.rank
        );

      case "rating-high":
        return (
          (b.rating ?? -1) -
            (a.rating ?? -1) ||
          (b.reviewCount ?? 0) -
            (a.reviewCount ?? 0) ||
          a.rank - b.rank
        );

      case "reviews-high":
        return (
          (b.reviewCount ?? -1) -
            (a.reviewCount ?? -1) ||
          a.rank - b.rank
        );

      case "value":
      default:
        return a.rank - b.rank;
    }
  });

  const eligibleProducts =
    ranked.filter(
      (row) =>
        row.inStock &&
        row.deliveryAvailable,
    );

  const bestProduct =
    eligibleProducts[0];

  const bestRawScore =
    bestProduct?.score
      .adjustedValueScore ?? null;

  const checkedDates = ranked
    .map((row) => row.checkedAt)
    .filter(Boolean)
    .sort();

  const latestCheckedAt =
    checkedDates.length > 0
      ? checkedDates[
          checkedDates.length - 1
        ]
      : null;

  const lastScanned = latestCheckedAt
    ? new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(
        new Date(latestCheckedAt),
      )
    : "—";

  const retailerCount = new Set(
    eligibleProducts.map(
      (row) => row.retailer,
    ),
  ).size;

  const hasActiveCriteria = Boolean(
    query ||
      selectedRetailer ||
      selectedBrand ||
      !inStockOnly ||
      !deliveryOnly ||
      selectedMinPrice >
        priceRangeMin ||
      selectedMaxPrice <
        priceRangeMax,
  );

  const resultLabel = hasActiveCriteria
    ? `${filteredRanked.length} ${
        filteredRanked.length === 1
          ? "result"
          : "results"
      }`
    : `${ranked.length} products`;

  return (
    <main className="min-h-screen bg-[var(--bb-background)] px-5 py-8 text-base leading-6 text-[var(--bb-text-primary)] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--bb-text-primary)]">
              bargain beacon
            </h1>

            <p className="bb-interface-text mt-2 text-[var(--bb-text-muted)]">
              Find the best value,
              not just the lowest price
            </p>
          </div>

          <div className="w-full md:mt-3.5 md:max-w-[380px]">
            <Suspense
              fallback={
                <div className="h-[52px] rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)]" />
              }
            >
              <SearchBar />
            </Suspense>
          </div>
        </header>

        <section className="relative mb-7 overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] px-8 py-10 shadow-[var(--bb-shadow-surface)] sm:px-10 lg:min-h-[320px] lg:px-12 lg:py-12">
          <div className="relative z-10 lg:max-w-[65%]">
            <p className="bb-interface-text text-3xl font-semibold leading-tight text-[var(--bb-accent)]">
              Best value today
            </p>

            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--bb-text-primary)] sm:text-5xl lg:text-6xl">
              {bestProduct ? (
                bestProduct.productName
              ) : (
                <span className="bb-interface-text">
                  No eligible products
                </span>
              )}
            </h2>

            <p className="mt-4 text-3xl font-medium leading-tight text-[var(--bb-text-secondary)]">
              {bestProduct?.retailer ??
                "—"}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex min-w-[104px] items-center justify-center gap-2 rounded-[var(--bb-radius)] bg-[var(--bb-surface-soft)] px-5 py-2 text-base font-bold text-[var(--bb-accent-strong)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
              >
                <path
                  fill="var(--bb-accent)"
                  d="M3 4.75C3 3.78 3.78 3 4.75 3h6.6c.46 0 .9.18 1.23.51l8.02 8.02a1.75 1.75 0 0 1 0 2.47L14 20.6a1.75 1.75 0 0 1-2.47 0L3.51 12.58A1.74 1.74 0 0 1 3 11.35v-6.6Z"
                />

                <circle
                  cx="7.5"
                  cy="7.5"
                  r="1.55"
                  fill="var(--bb-surface-soft)"
                />
              </svg>

              {bestProduct
                ? `£${bestProduct.score.deliveredPrice.toFixed(
                    2,
                  )}`
                : "—"}
            </span>

            <span className="inline-flex items-center gap-3 rounded-[var(--bb-radius)] bg-[var(--bb-surface-soft)] px-4 py-2.5 text-base text-[var(--bb-text-secondary)]">
              <span className="bb-interface-text font-medium">
                {bestProduct &&
                bestRawScore !== null
                  ? `${calculateDisplayScore(
                      bestProduct.score
                        .adjustedValueScore,
                      bestRawScore,
                    )}/100 value score`
                  : "—"}
              </span>
            </span>
          </div>

          <div className="pointer-events-none absolute -bottom-16 -right-8 hidden h-[370px] w-[370px] rounded-full bg-[var(--bb-surface-soft)] lg:block">
            <div className="absolute inset-[74px] flex items-center justify-center rounded-full bg-[var(--bb-surface)] shadow-[var(--bb-shadow-surface)]">
              <div className="text-center">
                <p className="bb-interface-text text-5xl font-semibold text-[var(--bb-accent)]">
                  3 ply
                </p>

                <p className="bb-interface-text mt-2 text-base text-[var(--bb-text-muted)]">
                  Best-value pick
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="flex items-center gap-5 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[var(--bb-shadow-surface)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--bb-surface-soft)] text-2xl text-[var(--bb-accent)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-8 w-8 fill-none stroke-current"
                strokeWidth="1.8"
              >
                <path
                  d="m4 7.5 8-4 8 4-8 4-8-4Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M4 7.5v9l8 4 8-4v-9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M12 11.5v9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <p className="bb-interface-text text-lg font-bold text-[var(--bb-accent-strong)]">
                Currently comparing
              </p>

              <p className="bb-interface-text mt-1 text-2xl font-medium leading-tight text-[var(--bb-text-primary)]">
                {eligibleProducts.length}{" "}
                products
              </p>

              <p className="bb-interface-text mt-2 text-base text-[var(--bb-text-muted)]">
                Eligible 3-ply listings
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[var(--bb-shadow-surface)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--bb-surface-soft)] text-2xl text-[var(--bb-accent)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-8 w-8 fill-none stroke-current"
                strokeWidth="1.8"
              >
                <path
                  d="M4 10h16l-1.5-5h-13L4 10Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M5 10v9h14v-9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M9 19v-5h6v5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M4 10c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <p className="bb-interface-text text-lg font-bold text-[var(--bb-accent-strong)]">
                Scanning
              </p>

              <p className="bb-interface-text mt-1 text-2xl font-medium leading-tight text-[var(--bb-text-primary)]">
                {retailerCount} retailers
              </p>

              <p className="bb-interface-text mt-2 text-base text-[var(--bb-text-muted)]">
                Delivery-friendly
                sources
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] p-6 shadow-[var(--bb-shadow-surface)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--bb-surface-soft)] text-2xl text-[var(--bb-accent)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-8 w-8 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3.5 2" />
              </svg>
            </div>

            <div>
              <p className="bb-interface-text text-lg font-bold text-[var(--bb-accent-strong)]">
                Last scanned
              </p>

              <p className="mt-1 text-xl font-medium leading-snug text-[var(--bb-text-primary)]">
                {lastScanned}
              </p>

              <p className="bb-interface-text mt-2 text-base text-[var(--bb-text-muted)]">
                Latest stored price
                check
              </p>
            </div>
          </article>
        </section>

        <section className="mb-5">
          <Suspense
            fallback={
              <div className="h-[72px] rounded-[var(--bb-radius)] bg-[var(--bb-surface)]" />
            }
          >
            <ProductFilters
              retailers={
                retailerOptions
              }
              brands={brandOptions}
              minPrice={priceRangeMin}
              maxPrice={priceRangeMax}
              resultLabel={resultLabel}
            />
          </Suspense>
        </section>

        <section className="overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] shadow-[var(--bb-shadow-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] table-fixed border-collapse text-base leading-6">
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-[360px]" />
                <col className="w-[150px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
              </colgroup>

              <thead>
                <tr className="border-b border-[var(--bb-border)] bg-[var(--bb-surface-soft)] text-left text-[var(--bb-accent-strong)]">
                  <th className="bb-interface-text px-5 py-5 text-base font-bold">
                    Value rank
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-base font-bold">
                    Product
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-base font-bold">
                    Retailer
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-center text-base font-bold">
                    Price
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-center text-base font-bold">
                    Sheets
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-center text-base font-bold">
                    Rating
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-center text-base font-bold">
                    Reviews
                  </th>

                  <th className="bb-interface-text px-5 py-5 text-center text-base font-bold">
                    Score
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedRanked.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--bb-border)] transition-colors last:border-0 hover:bg-[var(--bb-background)]"
                    >
                      <td className="px-5 py-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-surface-soft)] text-base font-bold text-[var(--bb-accent-strong)]">
                          {row.rank}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        {row.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[17px] font-semibold text-[var(--bb-text-primary)] hover:text-[var(--bb-accent)]"
                          >
                            {
                              row.productName
                            }
                          </a>
                        ) : (
                          <span className="block text-[17px] font-semibold leading-6 text-[var(--bb-text-primary)] hover:text-[var(--bb-accent)]">
                            {
                              row.productName
                            }
                          </span>
                        )}

                        <p className="bb-interface-text mt-1 text-base text-[var(--bb-text-muted)]">
                          {row.rollsPerPack ??
                            "—"}{" "}
                          rolls
                        </p>

                        {(!row.inStock ||
                          !row.deliveryAvailable) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {!row.inStock && (
                              <span className="bb-interface-text rounded-[var(--bb-radius)] bg-[var(--bb-surface-soft)] px-2 py-1 text-xs font-medium text-[var(--bb-text-muted)]">
                                Out of stock
                              </span>
                            )}

                            {!row.deliveryAvailable && (
                              <span className="bb-interface-text rounded-[var(--bb-radius)] bg-[var(--bb-surface-soft)] px-2 py-1 text-xs font-medium text-[var(--bb-text-muted)]">
                                Collection only
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-5 text-[var(--bb-text-secondary)]">
                        {row.retailer}
                      </td>

                      <td className="px-5 py-5 text-center font-medium tabular-nums text-[var(--bb-text-primary)]">
                        £
                        {row.score.deliveredPrice.toFixed(
                          2,
                        )}
                      </td>

                      <td className="px-5 py-5 text-center tabular-nums text-[var(--bb-text-secondary)]">
                        {row.score.totalSheets.toLocaleString(
                          "en-GB",
                        )}
                      </td>

                      <td className="px-5 py-5 text-center tabular-nums text-[var(--bb-text-secondary)]">
                        {row.rating !==
                        null ? (
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <span>
                              {row.rating}
                            </span>

                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              className="h-[18px] w-[18px] shrink-0 fill-[var(--bb-accent)]"
                            >
                              <path d="m12 2.8 2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 16.92l-5.54 2.91 1.06-6.16-4.48-4.36 6.19-.9L12 2.8Z" />
                            </svg>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-5 text-center tabular-nums text-[var(--bb-text-secondary)]">
                        {row.reviewCount?.toLocaleString(
                          "en-GB",
                        ) ?? "—"}
                      </td>

                      <td className="px-5 py-5 text-center tabular-nums">
                        <span className="inline-flex min-w-[74px] items-center justify-center rounded-[var(--bb-radius)] bg-[var(--bb-surface-soft)] px-4 py-2 font-semibold leading-none text-[var(--bb-accent-strong)]">
                          {bestRawScore !==
                          null
                            ? calculateDisplayScore(
                                row.score
                                  .adjustedValueScore,
                                bestRawScore,
                              )
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ),
                )}

                {sortedRanked.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="bb-interface-text px-5 py-12 text-center text-base text-[var(--bb-text-muted)]"
                    >
                      {hasActiveCriteria
                        ? "No matching products found"
                        : "No eligible products found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
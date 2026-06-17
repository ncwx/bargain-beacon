import { calculateScore } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

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

function unwrapRelation<T>(relation: OneOrMany<T>): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function toNullableNumber(
  value: DatabaseNumber | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export default async function Home() {
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
      <main className="min-h-screen bg-[#fff8fa] p-8 text-base lowercase text-[#31262b]">
        <p>error loading products: {error.message}</p>
      </main>
    );
  }

  const priceChecks = (data ?? []) as unknown as PriceCheckRow[];

  const ranked = priceChecks
    .flatMap((row) => {
      const product = unwrapRelation(row.products);

      if (
        !product ||
        product.ply !== 3 ||
        row.in_stock !== true ||
        row.delivery_available !== true
      ) {
        return [];
      }

      const price = toNullableNumber(row.price);
      const rating = toNullableNumber(product.rating);
      const deliveryFee = toNullableNumber(row.delivery_fee);
      const smallOrderCharge = toNullableNumber(
        row.small_order_charge,
      );

      if (price === null) {
        return [];
      }

      const score = calculateScore({
        price,
        rolls_per_pack: product.rolls_per_pack,
        sheets_per_roll: product.sheets_per_roll,
        delivery_fee: deliveryFee,
        small_order_charge: smallOrderCharge,
        rating,
        review_count: product.review_count,
      });

      if (!score) {
        return [];
      }

      const retailer = unwrapRelation(product.retailers);

      return [
        {
          id: row.id,
          productName: product.product_name,
          brand: product.brand,
          retailer: retailer?.name ?? "unknown",
          url: product.url,
          price,
          rating,
          reviewCount: product.review_count,
          checkedAt: row.checked_at,
          rollsPerPack: product.rolls_per_pack,
          score,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.score.adjustedValueScore -
        b.score.adjustedValueScore,
    );

  const bestProduct = ranked[0];

  const checkedDates = ranked
    .map((row) => row.checkedAt)
    .filter(Boolean)
    .sort();

  const latestCheckedAt =
    checkedDates.length > 0
      ? checkedDates[checkedDates.length - 1]
      : null;

  const lastScanned = latestCheckedAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(latestCheckedAt))
    : "—";

  const retailerCount = new Set(
    ranked.map((row) => row.retailer),
  ).size;

  return (
    <main className="min-h-screen bg-[#fff8fa] px-5 py-8 text-base leading-6 lowercase sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-5xl font-semibold tracking-tight text-[#31262b]">
            bargain beacon
            <span
              aria-hidden="true"
              className="ml-1 text-[#fb99b9]"
            >
              ●
            </span>
          </h1>

          <p className="mt-2 text-lg text-[#6f5a62]">
            find the best value, not just the lowest price
          </p>
        </header>

        <section className="relative mb-7 overflow-hidden rounded-[15px] border border-[#f6c8d6] bg-white px-8 py-10 shadow-[0_5px_18px_rgba(120,70,90,0.06)] sm:px-10 lg:min-h-[320px] lg:px-12 lg:py-12">
          <div className="relative z-10 lg:max-w-[65%]">
            <p className="text-3xl font-semibold leading-tight text-[#f15f91]">
              best value today
            </p>

            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-[#31262b] sm:text-5xl lg:text-6xl">
              {bestProduct?.productName ??
                "no eligible products"}
            </h2>

            <p className="mt-4 text-3xl font-medium leading-tight text-[#6f5a62]">
              {bestProduct?.retailer ?? "—"}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex min-w-[104px] items-center justify-center gap-2 rounded-[12px] bg-[#ffdbe7] px-5 py-2 text-base font-bold text-[#9f2f57]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
              >
                <path
                  fill="#f15f91"
                  d="M3 4.75C3 3.78 3.78 3 4.75 3h6.6c.46 0 .9.18 1.23.51l8.02 8.02a1.75 1.75 0 0 1 0 2.47L14 20.6a1.75 1.75 0 0 1-2.47 0L3.51 12.58A1.74 1.74 0 0 1 3 11.35v-6.6Z"
                />

                <circle
                  cx="7.5"
                  cy="7.5"
                  r="1.55"
                  fill="#fff1f5"
                />
              </svg>

              {bestProduct
                ? `£${bestProduct.score.deliveredPrice.toFixed(2)}`
                : "—"}
            </span>

            <span className="inline-flex items-center gap-3 rounded-[12px] bg-[#fff1f5] px-4 py-2.5 text-base text-[#5f4b53]">
              <span className="font-medium">
                {bestProduct
                  ? `${bestProduct.score.adjustedValueScore.toFixed(3)} score`
                  : "—"}
              </span>

              <span
                aria-hidden="true"
                className="text-[#d8aeba]"
              >
                |
              </span>

              <span className="text-[#806c74]">
                lower is better
              </span>
            </span>
          </div>

          <div className="pointer-events-none absolute -bottom-16 -right-8 hidden h-[370px] w-[370px] rounded-full bg-[#fbe4ec] lg:block">
            <div className="absolute inset-[74px] flex items-center justify-center rounded-full bg-white/80 shadow-[0_5px_18px_rgba(120,70,90,0.05)]">
              <div className="text-center">
                <p className="text-5xl font-semibold text-[#fb99b9]">
                  3 ply
                </p>

                <p className="mt-2 text-base text-[#6f5a62]">
                  best-value pick
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="flex items-center gap-5 rounded-[14px] border border-[#f2e4e9] bg-white p-6 shadow-[0_4px_14px_rgba(120,70,90,0.06)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffecef] text-2xl text-[#d94f7d]">
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
              <p className="text-base font-bold text-[#b52f61]">
                currently comparing
              </p>

              <p className="mt-1 text-2xl font-medium leading-tight text-[#31262b]">
                {ranked.length} products
              </p>

              <p className="mt-2 text-base text-[#806c74]">
                eligible 3-ply listings
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-[14px] border border-[#f2e4e9] bg-white p-6 shadow-[0_4px_14px_rgba(120,70,90,0.06)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffecef] text-2xl text-[#d94f7d]">
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
              <p className="text-base font-bold text-[#b52f61]">
                scanning
              </p>

              <p className="mt-1 text-2xl font-medium leading-tight text-[#31262b]">
                {retailerCount} retailers
              </p>

              <p className="mt-2 text-base text-[#806c74]">
                delivery-friendly sources
              </p>
            </div>
          </article>

          <article className="flex items-center gap-5 rounded-[14px] border border-[#f2e4e9] bg-white p-6 shadow-[0_4px_14px_rgba(120,70,90,0.06)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffecef] text-2xl text-[#d94f7d]">
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
              <p className="text-base font-bold text-[#b52f61]">
                last scanned
              </p>

              <p className="mt-1 text-xl font-medium leading-snug text-[#31262b]">
                {lastScanned}
              </p>

              <p className="mt-2 text-base text-[#806c74]">
                latest stored price check
              </p>
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-[15px] border border-[#f2e4e9] bg-white shadow-[0_4px_14px_rgba(120,70,90,0.06)]">
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
                <tr className="border-b border-[#efced9] bg-[#fff5f8] text-left text-[#b52f61]">
                  <th className="px-5 py-5 text-base font-bold">
                    rank
                  </th>

                  <th className="px-5 py-5 text-base font-bold">
                    product
                  </th>

                  <th className="px-5 py-5 text-base font-bold">
                    retailer
                  </th>

                  <th className="px-5 py-5 text-center text-base font-bold">
                    price
                  </th>

                  <th className="px-5 py-5 text-center text-base font-bold">
                    sheets
                  </th>

                  <th className="px-5 py-5 text-center text-base font-bold">
                    rating
                  </th>

                  <th className="px-5 py-5 text-center text-base font-bold">
                    reviews
                  </th>

                  <th className="px-5 py-5 text-center text-base font-bold">
                    score
                  </th>
                </tr>
              </thead>

              <tbody>
                {ranked.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f5e9ed] transition-colors last:border-0 hover:bg-[#fff8fa]"
                  >
                    <td className="px-5 py-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffecef] text-base font-bold text-[#b83e69]">
                        {index + 1}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[17px] font-semibold text-[#31262b] hover:text-[#d94f7d]"
                        >
                          {row.productName}
                        </a>
                      ) : (
                        <span className="block text-[17px] font-semibold leading-6 text-[#31262b] hover:text-[#d94f7d]">
                          {row.productName}
                        </span>
                      )}

                      <p className="mt-1 text-base text-[#806c74]">
                        {row.rollsPerPack ?? "—"} rolls
                      </p>
                    </td>

                    <td className="px-5 py-5 text-[#4e3d44]">
                      {row.retailer}
                    </td>

                    <td className="px-5 py-5 text-center font-medium tabular-nums text-[#31262b]">
                      £{row.score.deliveredPrice.toFixed(2)}
                    </td>

                    <td className="px-5 py-5 text-center tabular-nums text-[#4e3d44]">
                      {row.score.totalSheets.toLocaleString("en-GB")}
                    </td>

                    <td className="px-5 py-5 text-center tabular-nums text-[#4e3d44]">
                      {row.rating !== null ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <span>{row.rating}</span>

                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-[18px] w-[18px] shrink-0 fill-[#f15f91]"
                          >
                            <path d="m12 2.8 2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 16.92l-5.54 2.91 1.06-6.16-4.48-4.36 6.19-.9L12 2.8Z" />
                          </svg>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-5 text-center tabular-nums text-[#4e3d44]">
                      {row.reviewCount?.toLocaleString("en-GB") ?? "—"}
                    </td>

                    <td className="px-5 py-5 text-center tabular-nums">
                      <span className="inline-flex min-w-[74px] items-center justify-center rounded-[12px] bg-[#ffecef] px-4 py-2 font-semibold leading-none text-[#9f2f57]">
                        {row.score.adjustedValueScore.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}

                {ranked.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-base text-[#6f5a62]"
                    >
                      no eligible products found
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
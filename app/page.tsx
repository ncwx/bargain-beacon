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
      <main className="min-h-screen bg-[#fff8fa] p-8 lowercase text-[#31262b]">
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
      const smallOrderCharge = toNullableNumber(row.small_order_charge);

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
          score,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.score.adjustedValueScore - b.score.adjustedValueScore,
    );

  const bestProduct = ranked[0];

  const latestCheckedAt = ranked
    .map((row) => row.checkedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const lastScanned = latestCheckedAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(latestCheckedAt))
    : "—";

  const retailerCount = new Set(
    ranked.map((row) => row.retailer),
  ).size;

  return (
    <main className="min-h-screen bg-[#fff8fa] px-5 py-8 lowercase sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-[#31262b]">
            bargain beacon
            <span className="ml-1 text-[#fb99b9]">●</span>
          </h1>

          <p className="mt-2 text-[#7a6970]">
            find the best value, not just the lowest price
          </p>
        </header>

        <section className="relative mb-7 overflow-hidden rounded-[28px] border border-[#f9c9d8] bg-white px-7 py-9 sm:px-10 lg:min-h-[310px] lg:px-12 lg:py-12">
          <div className="relative z-10 max-w-2xl">
            <p className="text-sm font-semibold text-[#f15f91]">
              best value today
            </p>

            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-[#31262b] sm:text-5xl">
              {bestProduct?.productName ?? "no eligible products"}
            </h2>

            <p className="mt-3 text-xl text-[#7a6970]">
              {bestProduct?.retailer ?? "—"}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-[#ffecef] px-4 py-2 font-medium text-[#8f244c]">
                {bestProduct
                  ? `£${bestProduct.price.toFixed(2)}`
                  : "—"}
              </span>

              <span className="rounded-full bg-[#fff7fa] px-4 py-2 text-[#5f4b53]">
                {bestProduct
                  ? `${bestProduct.score.adjustedValueScore.toFixed(3)} score`
                  : "—"}
              </span>

              <span className="rounded-full bg-[#fff7fa] px-4 py-2 text-[#9a858d]">
                lower is better
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-20 -right-10 hidden h-[390px] w-[390px] rounded-full bg-[#ffe6ef] lg:block">
            <div className="absolute inset-20 flex items-center justify-center rounded-full bg-white/70 shadow-sm">
              <div className="text-center">
                <p className="text-5xl font-semibold text-[#fb99b9]">
                  3 ply
                </p>

                <p className="mt-2 text-sm text-[#7a6970]">
                  best-value pick
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-[#f2e4e9] bg-white p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffecef] text-xl text-[#d94f7d]">
              ◇
            </div>

            <p className="text-sm text-[#7a6970]">
              currently tracking
            </p>

            <p className="mt-1 text-2xl font-medium text-[#31262b]">
              {ranked.length} products
            </p>

            <p className="mt-2 text-sm text-[#9a858d]">
              eligible 3-ply listings
            </p>
          </article>

          <article className="rounded-[22px] border border-[#f2e4e9] bg-white p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffecef] text-xl text-[#d94f7d]">
              ⌂
            </div>

            <p className="text-sm text-[#7a6970]">
              scanning
            </p>

            <p className="mt-1 text-2xl font-medium text-[#31262b]">
              {retailerCount} retailers
            </p>

            <p className="mt-2 text-sm text-[#9a858d]">
              delivery-friendly sources
            </p>
          </article>

          <article className="rounded-[22px] border border-[#f2e4e9] bg-white p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffecef] text-xl text-[#d94f7d]">
              ↻
            </div>

            <p className="text-sm text-[#7a6970]">
              last scanned
            </p>

            <p className="mt-1 text-2xl font-medium text-[#31262b]">
              {lastScanned}
            </p>

            <p className="mt-2 text-sm text-[#9a858d]">
              latest stored price check
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#f2e4e9] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#f2e4e9] text-left text-[#7a6970]">
                  <th className="px-5 py-5 font-medium">rank</th>
                  <th className="px-5 py-5 font-medium">product</th>
                  <th className="px-5 py-5 font-medium">retailer</th>
                  <th className="px-5 py-5 font-medium">price</th>
                  <th className="px-5 py-5 font-medium">sheets</th>
                  <th className="px-5 py-5 font-medium">rating</th>
                  <th className="px-5 py-5 font-medium">reviews</th>
                  <th className="px-5 py-5 font-medium">score</th>
                </tr>
              </thead>

              <tbody>
                {ranked.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f5e9ed] transition-colors last:border-0 hover:bg-[#fff8fa]"
                  >
                    <td className="px-5 py-5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffecef] font-medium text-[#b83e69]">
                        {index + 1}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#31262b] hover:text-[#d94f7d]"
                        >
                          {row.productName}
                        </a>
                      ) : (
                        <span className="font-medium text-[#31262b]">
                          {row.productName}
                        </span>
                      )}

                      <p className="mt-1 text-xs text-[#9a858d]">
                        {row.brand ?? "unknown brand"} · 3 ply
                      </p>
                    </td>

                    <td className="px-5 py-5 text-[#4e3d44]">
                      {row.retailer}
                    </td>

                    <td className="px-5 py-5 font-medium text-[#31262b]">
                      £{row.price.toFixed(2)}
                    </td>

                    <td className="px-5 py-5 text-[#4e3d44]">
                      {row.score.totalSheets.toLocaleString("en-GB")}
                    </td>

                    <td className="px-5 py-5 text-[#4e3d44]">
                      {row.rating ?? "—"}
                    </td>

                    <td className="px-5 py-5 text-[#4e3d44]">
                      {row.reviewCount?.toLocaleString("en-GB") ??
                        "—"}
                    </td>

                    <td className="px-5 py-5">
                      <span className="rounded-full bg-[#ffecef] px-4 py-2 font-semibold text-[#9f2f57]">
                        {row.score.adjustedValueScore.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}

                {ranked.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-[#7a6970]"
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
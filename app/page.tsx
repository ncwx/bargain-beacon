import { supabase } from "@/lib/supabase";
import { calculateScore } from "@/lib/scoring";

type PriceCheckRow = {
  id: string;
  price: number;
  delivery_fee: number | null;
  small_order_charge: number | null;
  in_stock: boolean | null;
  delivery_available: boolean | null;
  checked_at: string;
  products: {
    id: string;
    product_name: string;
    brand: string | null;
    url: string | null;
    ply: number | null;
    rolls_per_pack: number | null;
    sheets_per_roll: number | null;
    total_sheets: number | null;
    rating: number | null;
    review_count: number | null;
    retailers: {
      name: string;
    } | null;
  } | null;
};

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
    return <main className="p-8">Error: {error.message}</main>;
  }

  const ranked = ((data ?? []) as PriceCheckRow[])
    .filter((row) => row.products !== null)
    .filter((row) => row.products?.ply === 3)
    .filter((row) => row.in_stock === true)
    .filter((row) => row.delivery_available === true)
    .map((row) => {
      const product = row.products!;

      const score = calculateScore({
        price: Number(row.price),
        rolls_per_pack: product.rolls_per_pack,
        sheets_per_roll: product.sheets_per_roll,
        delivery_fee: row.delivery_fee,
        small_order_charge: row.small_order_charge,
        rating: product.rating,
        review_count: product.review_count,
      });

      return {
        id: row.id,
        productName: product.product_name,
        brand: product.brand,
        retailer: product.retailers?.name ?? "Unknown",
        url: product.url,
        price: Number(row.price),
        rating: product.rating,
        reviewCount: product.review_count,
        score,
      };
    })
    .filter((row) => row.score !== null)
    .sort((a, b) => a.score!.adjustedValueScore - b.score!.adjustedValueScore);

  return (
    <main className="min-h-screen bg-[#fff7fa] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#3A2A2F]">PlySpy</h1>
          <p className="mt-2 text-[#6b4b57]">
            Best-value delivered 3-ply toilet paper tracker.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6b4b57]">
            Tracking <strong>{ranked.length}</strong> eligible products.
            Lower score = better value.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#FB99B9] text-left text-[#3A2A2F]">
                <th className="p-3">Rank</th>
                <th className="p-3">Product</th>
                <th className="p-3">Retailer</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total sheets</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Reviews</th>
                <th className="p-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-[#FFECEF] odd:bg-[#FFECEF]"
                >
                  <td className="p-3 font-medium">{index + 1}</td>
                  <td className="p-3">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        className="font-medium underline"
                      >
                        {row.productName}
                      </a>
                    ) : (
                      row.productName
                    )}
                  </td>
                  <td className="p-3">{row.retailer}</td>
                  <td className="p-3">{row.brand ?? "—"}</td>
                  <td className="p-3">£{row.price.toFixed(2)}</td>
                  <td className="p-3">{row.score!.totalSheets}</td>
                  <td className="p-3">{row.rating ?? "—"}</td>
                  <td className="p-3">{row.reviewCount ?? "—"}</td>
                  <td className="p-3 font-semibold">
                    {row.score!.adjustedValueScore.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
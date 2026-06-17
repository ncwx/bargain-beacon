"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type ProductFiltersProps = {
  retailers: string[];
  brands: string[];
};

export default function ProductFilters({
  retailers,
  brands,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedRetailer = searchParams.get("retailer") ?? "";
  const selectedBrand = searchParams.get("brand") ?? "";
  const selectedSort = searchParams.get("sort") ?? "value";

  function updateFilter(name: "retailer" | "brand" | "sort", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (name === "sort" && value === "value") {
      params.delete("sort");
    } else if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const queryString = params.toString();

    router.push(
      queryString ? `${pathname}?${queryString}` : pathname,
      { scroll: false },
    );
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("retailer");
    params.delete("brand");

    const queryString = params.toString();

    router.push(
      queryString ? `${pathname}?${queryString}` : pathname,
      { scroll: false },
    );
  }

  const hasActiveFilters = selectedRetailer || selectedBrand;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor="retailer-filter">
        filter by retailer
      </label>

      <select
        id="retailer-filter"
        value={selectedRetailer}
        onChange={(event) =>
          updateFilter("retailer", event.target.value)
        }
        className="
          min-w-[180px] rounded-xl border border-[#f2e4e9]
          bg-white px-4 py-2.5 text-sm text-[#31262b]
          outline-none transition
          focus:border-[#fb99b9]
          focus:ring-4 focus:ring-[#ffecef]
        "
      >
        <option value="">all retailers</option>

        {retailers.map((retailer) => (
          <option key={retailer} value={retailer}>
            {retailer.toLowerCase()}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="brand-filter">
        filter by brand
      </label>

      <select
        id="brand-filter"
        value={selectedBrand}
        onChange={(event) =>
          updateFilter("brand", event.target.value)
        }
        className="
          min-w-[180px] rounded-xl border border-[#f2e4e9]
          bg-white px-4 py-2.5 text-sm text-[#31262b]
          outline-none transition
          focus:border-[#fb99b9]
          focus:ring-4 focus:ring-[#ffecef]
        "
      >
        <option value="">all brands</option>

        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand.toLowerCase()}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="sort-products">
        sort products
      </label>
      
      <select
        id="sort-products"
        value={selectedSort}
        onChange={(event) =>
            updateFilter("sort", event.target.value)
        }
        className="
            min-w-[190px] rounded-xl border border-[#f2e4e9]
            bg-white px-4 py-2.5 text-sm text-[#31262b]
            outline-none transition
            focus:border-[#fb99b9]
            focus:ring-4 focus:ring-[#ffecef]
        "
      >
        <option value="value">best value</option>
        <option value="price-low">lowest delivered price</option>
        <option value="sheets-high">most sheets</option>
        <option value="rating-high">highest rated</option>
        <option value="reviews-high">most reviewed</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="
            px-2 py-2 text-sm text-[#806c74]
            underline-offset-4 transition
            hover:text-[#31262b] hover:underline
          "
        >
          clear filters
        </button>
      )}
    </div>
  );
}
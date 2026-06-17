"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type ProductFiltersProps = {
  retailers: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
};

type FilterName =
  | "retailer"
  | "brand"
  | "sort";

type PriceRange = {
  min: number;
  max: number;
};

export default function ProductFilters({
  retailers,
  brands,
  minPrice,
  maxPrice,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeMinPrice = Number.isFinite(minPrice)
    ? Math.floor(minPrice)
    : 0;

  const safeMaxPrice =
    Number.isFinite(maxPrice) &&
    maxPrice > safeMinPrice
      ? Math.ceil(maxPrice)
      : safeMinPrice + 1;

  const selectedRetailer =
    searchParams.get("retailer") ?? "";

  const selectedBrand =
    searchParams.get("brand") ?? "";

  const selectedSort =
    searchParams.get("sort") ?? "value";

  const minPriceParam =
    searchParams.get("minPrice");

  const maxPriceParam =
    searchParams.get("maxPrice");

  const parsedMinPrice =
    minPriceParam === null
      ? Number.NaN
      : Number(minPriceParam);

  const parsedMaxPrice =
    maxPriceParam === null
      ? Number.NaN
      : Number(maxPriceParam);

  const selectedMinPrice =
    Number.isFinite(parsedMinPrice)
      ? Math.max(
          safeMinPrice,
          Math.min(
            parsedMinPrice,
            safeMaxPrice - 1,
          ),
        )
      : safeMinPrice;

  const selectedMaxPrice =
    Number.isFinite(parsedMaxPrice)
      ? Math.min(
          safeMaxPrice,
          Math.max(
            parsedMaxPrice,
            selectedMinPrice + 1,
          ),
        )
      : safeMaxPrice;

  const [priceRange, setPriceRange] =
    useState<PriceRange>({
      min: selectedMinPrice,
      max: selectedMaxPrice,
    });

  const [activeThumb, setActiveThumb] =
    useState<"min" | "max" | null>(null);

  useEffect(() => {
    setPriceRange({
      min: selectedMinPrice,
      max: selectedMaxPrice,
    });
  }, [
    selectedMinPrice,
    selectedMaxPrice,
  ]);

  const rangeSize =
    safeMaxPrice - safeMinPrice;

  const minPosition =
    ((priceRange.min - safeMinPrice) /
      rangeSize) *
    100;

  const maxPosition =
    ((priceRange.max - safeMinPrice) /
      rangeSize) *
    100;

  function navigateWithParams(
    params: URLSearchParams,
  ) {
    const queryString = params.toString();

    router.push(
      queryString
        ? `${pathname}?${queryString}`
        : pathname,
      { scroll: false },
    );
  }

  function updateFilter(
    name: FilterName,
    value: string,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (
      name === "sort" &&
      value === "value"
    ) {
      params.delete("sort");
    } else if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    navigateWithParams(params);
  }

  function commitPriceRange(
    nextMin: number,
    nextMax: number,
  ) {
    if (
      nextMin === selectedMinPrice &&
      nextMax === selectedMaxPrice
    ) {
      return;
    }

    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (nextMin <= safeMinPrice) {
      params.delete("minPrice");
    } else {
      params.set(
        "minPrice",
        String(nextMin),
      );
    }

    if (nextMax >= safeMaxPrice) {
      params.delete("maxPrice");
    } else {
      params.set(
        "maxPrice",
        String(nextMax),
      );
    }

    navigateWithParams(params);
  }

  function handleMinChange(value: number) {
    const nextMin = Math.min(
      value,
      priceRange.max - 1,
    );

    setPriceRange((current) => ({
      ...current,
      min: nextMin,
    }));
  }

  function handleMaxChange(value: number) {
    const nextMax = Math.max(
      value,
      priceRange.min + 1,
    );

    setPriceRange((current) => ({
      ...current,
      max: nextMax,
    }));
  }

  function clearFilters() {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.delete("retailer");
    params.delete("brand");
    params.delete("minPrice");
    params.delete("maxPrice");

    navigateWithParams(params);
  }

  const hasActiveFilters = Boolean(
    selectedRetailer ||
      selectedBrand ||
      selectedMinPrice > safeMinPrice ||
      selectedMaxPrice < safeMaxPrice,
  );

  const selectClassName =
    "w-full rounded-xl border border-[#f2e4e9] bg-white px-4 py-2.5 text-sm text-[#31262b] outline-none transition focus:border-[#fb99b9] focus:ring-4 focus:ring-[#ffecef] sm:w-auto";

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label
            className="sr-only"
            htmlFor="retailer-filter"
          >
            filter by retailer
          </label>

          <select
            id="retailer-filter"
            value={selectedRetailer}
            onChange={(event) =>
              updateFilter(
                "retailer",
                event.target.value,
              )
            }
            className={`${selectClassName} min-w-[180px]`}
          >
            <option value="">
              all retailers
            </option>

            {retailers.map((retailer) => (
              <option
                key={retailer}
                value={retailer}
              >
                {retailer.toLowerCase()}
              </option>
            ))}
          </select>

          <label
            className="sr-only"
            htmlFor="brand-filter"
          >
            filter by brand
          </label>

          <select
            id="brand-filter"
            value={selectedBrand}
            onChange={(event) =>
              updateFilter(
                "brand",
                event.target.value,
              )
            }
            className={`${selectClassName} min-w-[180px]`}
          >
            <option value="">
              all brands
            </option>

            {brands.map((brand) => (
              <option
                key={brand}
                value={brand}
              >
                {brand.toLowerCase()}
              </option>
            ))}
          </select>

          <label
            className="sr-only"
            htmlFor="sort-products"
          >
            sort products
          </label>

          <select
            id="sort-products"
            value={selectedSort}
            onChange={(event) =>
              updateFilter(
                "sort",
                event.target.value,
              )
            }
            className={`${selectClassName} min-w-[190px]`}
          >
            <option value="value">
              best value
            </option>

            <option value="price-low">
              lowest delivered price
            </option>

            <option value="sheets-high">
              most sheets
            </option>

            <option value="rating-high">
              highest rated
            </option>

            <option value="reviews-high">
              most reviewed
            </option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-2 text-sm text-[#806c74] underline-offset-4 transition hover:text-[#31262b] hover:underline"
            >
              clear filters
            </button>
          )}
        </div>

        <div className="w-full lg:w-[260px] lg:-translate-y-0.5 lg:shrink-0">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-[#806c74]">
              price
            </span>

            <span className="text-sm font-medium text-[#806c74]">
              £{priceRange.min} – £
              {priceRange.max}
            </span>
          </div>

          <div className="relative h-7">
            <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#f3e4e9]" />

            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#fb99b9]"
              style={{
                left: `${minPosition}%`,
                right: `${
                  100 - maxPosition
                }%`,
              }}
            />

            <input
              aria-label="minimum price"
              aria-valuetext={`£${priceRange.min}`}
              type="range"
              min={safeMinPrice}
              max={safeMaxPrice}
              step="1"
              value={priceRange.min}
              onPointerDown={() =>
                setActiveThumb("min")
              }
              onPointerUp={(event) => {
                const nextMin = Math.min(
                  Number(
                    event.currentTarget
                      .value,
                  ),
                  priceRange.max - 1,
                );

                setActiveThumb(null);

                commitPriceRange(
                  nextMin,
                  priceRange.max,
                );
              }}
              onKeyUp={(event) => {
                const nextMin = Math.min(
                  Number(
                    event.currentTarget
                      .value,
                  ),
                  priceRange.max - 1,
                );

                commitPriceRange(
                  nextMin,
                  priceRange.max,
                );
              }}
              onChange={(event) =>
                handleMinChange(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="price-range-input absolute inset-0 h-7 w-full"
              style={{
                zIndex:
                  activeThumb === "min"
                    ? 4
                    : 3,
              }}
            />

            <input
              aria-label="maximum price"
              aria-valuetext={`£${priceRange.max}`}
              type="range"
              min={safeMinPrice}
              max={safeMaxPrice}
              step="1"
              value={priceRange.max}
              onPointerDown={() =>
                setActiveThumb("max")
              }
              onPointerUp={(event) => {
                const nextMax = Math.max(
                  Number(
                    event.currentTarget
                      .value,
                  ),
                  priceRange.min + 1,
                );

                setActiveThumb(null);

                commitPriceRange(
                  priceRange.min,
                  nextMax,
                );
              }}
              onKeyUp={(event) => {
                const nextMax = Math.max(
                  Number(
                    event.currentTarget
                      .value,
                  ),
                  priceRange.min + 1,
                );

                commitPriceRange(
                  priceRange.min,
                  nextMax,
                );
              }}
              onChange={(event) =>
                handleMaxChange(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="price-range-input absolute inset-0 h-7 w-full"
              style={{
                zIndex:
                  activeThumb === "max"
                    ? 4
                    : 2,
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .price-range-input {
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          pointer-events: none;
        }

        .price-range-input::-webkit-slider-runnable-track {
          height: 6px;
          border: none;
          background: transparent;
        }

        .price-range-input::-webkit-slider-thumb {
          width: 22px;
          height: 22px;
          margin-top: -8px;
          appearance: none;
          -webkit-appearance: none;
          border: 3px solid #fb99b9;
          border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 2px 6px
            rgba(120, 70, 90, 0.16);
          cursor: grab;
          pointer-events: auto;
        }

        .price-range-input::-webkit-slider-thumb:active {
          cursor: grabbing;
          box-shadow:
            0 0 0 4px #ffecef,
            0 2px 6px
              rgba(120, 70, 90, 0.16);
        }

        .price-range-input:focus-visible {
          outline: none;
        }

        .price-range-input:focus-visible::-webkit-slider-thumb {
          box-shadow:
            0 0 0 4px #ffecef,
            0 2px 6px
              rgba(120, 70, 90, 0.16);
        }

        .price-range-input::-moz-range-track {
          height: 6px;
          border: none;
          background: transparent;
        }

        .price-range-input::-moz-range-progress {
          background: transparent;
        }

        .price-range-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border: 3px solid #fb99b9;
          border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 2px 6px
            rgba(120, 70, 90, 0.16);
          cursor: grab;
          pointer-events: auto;
        }

        .price-range-input::-moz-range-thumb:active {
          cursor: grabbing;
          box-shadow:
            0 0 0 4px #ffecef,
            0 2px 6px
              rgba(120, 70, 90, 0.16);
        }
      `}</style>
    </>
  );
}
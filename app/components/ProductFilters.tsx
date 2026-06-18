"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { formatInterfaceText } from "@/config/design";

type ProductFiltersProps = {
  retailers: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  resultLabel: string;
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
  resultLabel,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] =
    useState(false);

  const safeMinPrice = Number.isFinite(
    minPrice,
  )
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

  const inStockOnly =
    searchParams.get("stock") !== "all";

  const deliveryOnly =
    searchParams.get("delivery") !==
    "all";

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
    useState<"min" | "max" | null>(
      null,
    );

  useEffect(() => {
    setPriceRange({
      min: selectedMinPrice,
      max: selectedMaxPrice,
    });
  }, [
    selectedMinPrice,
    selectedMaxPrice,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

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
    const queryString =
      params.toString();

    router.push(
      queryString
        ? `${pathname}?${queryString}`
        : pathname,
      {
        scroll: false,
      },
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

  function updateAvailabilityFilter(
    name: "stock" | "delivery",
    checked: boolean,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (checked) {
      params.delete(name);
    } else {
      params.set(name, "all");
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

  function handleMinChange(
    value: number,
  ) {
    const nextMin = Math.min(
      value,
      priceRange.max - 1,
    );

    setPriceRange((current) => ({
      ...current,
      min: nextMin,
    }));
  }

  function handleMaxChange(
    value: number,
  ) {
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
    params.delete("stock");
    params.delete("delivery");

    navigateWithParams(params);
  }

  const priceFilterIsActive =
    selectedMinPrice > safeMinPrice ||
    selectedMaxPrice < safeMaxPrice;

  const activeFilterCount = [
    Boolean(selectedRetailer),
    Boolean(selectedBrand),
    !inStockOnly,
    !deliveryOnly,
    priceFilterIsActive,
  ].filter(Boolean).length;

  const hasActiveFilters =
    activeFilterCount > 0;

  const drawerSelectClassName =
    "w-full rounded-xl border border-[#f2e4e9] bg-white px-4 py-3 text-base text-[#31262b] outline-none transition focus:border-[#fb99b9] focus:ring-4 focus:ring-[#ffecef]";

  const sortSelectClassName =
    "min-h-[44px] min-w-[190px] appearance-none rounded-xl border border-[#f2e4e9] bg-white py-2.5 pl-4 pr-12 text-sm text-[#31262b] outline-none transition focus:border-[#fb99b9] focus:ring-4 focus:ring-[#ffecef]";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="product-filter-drawer"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#f2e4e9] bg-white px-4 py-2.5 text-sm font-semibold text-[#31262b] transition hover:border-[#fb99b9] focus:outline-none focus:ring-4 focus:ring-[#ffecef]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
              <path d="M9 4v4" />
              <path d="M15 10v4" />
              <path d="M11 16v4" />
            </svg>

            <span>
              {formatInterfaceText(
                "Filters",
              )}
            </span>

            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fb99b9] px-1.5 text-xs font-bold text-[#31262b]">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="whitespace-nowrap text-sm font-medium text-[#806c74]">
            {formatInterfaceText(
              resultLabel,
            )}
          </span>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <label
            className="shrink-0 text-sm font-medium text-[#806c74]"
            htmlFor="sort-products"
          >
            {formatInterfaceText(
              "Sort by",
            )}
          </label>

          <div className="relative flex-1 font-bold text-[#31262b] sm:flex-none">
            <select
              id="sort-products"
              value={selectedSort}
              onChange={(event) =>
                updateFilter(
                  "sort",
                  event.target.value,
                )
              }
              className={`${sortSelectClassName} w-full`}
            >
              <option value="value">
                {formatInterfaceText(
                  "Best value",
                )}
              </option>

              <option value="price-low">
                {formatInterfaceText(
                  "Lowest delivered price",
                )}
              </option>

              <option value="sheets-high">
                {formatInterfaceText(
                  "Most sheets",
                )}
              </option>

              <option value="rating-high">
                {formatInterfaceText(
                  "Highest rated",
                )}
              </option>

              <option value="reviews-high">
                {formatInterfaceText(
                  "Most reviewed",
                )}
              </option>
            </select>

            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#31262b]"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() =>
              setIsOpen(false)
            }
            className="absolute inset-0 bg-[#31262b]/30"
            style={{
              animation:
                "filter-backdrop-in 240ms ease-out",
            }}
          />

          <aside
            id="product-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-drawer-title"
            className="absolute inset-y-0 left-0 flex w-full max-w-[400px] flex-col bg-[#fffafb] shadow-[12px_0_40px_rgba(49,38,43,0.18)]"
            style={{
              animation:
                "filter-drawer-in 280ms cubic-bezier(0.25, 0.8, 0.25, 1)",
              willChange: "transform",
            }}
          >
            <div className="flex items-center justify-between border-b border-[#f2e4e9] px-6 py-5">
              <div>
                <h2
                  id="filter-drawer-title"
                  className="text-xl font-bold text-[#31262b]"
                >
                  {formatInterfaceText(
                    "Filters",
                  )}
                </h2>

                <p className="mt-1 text-sm text-[#806c74]">
                  {formatInterfaceText(
                    "Narrow down your results",
                  )}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close filters"
                onClick={() =>
                  setIsOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-[#806c74] transition hover:bg-[#ffecef] hover:text-[#31262b] focus:outline-none focus:ring-4 focus:ring-[#ffecef]"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <section className="border-b border-[#f2e4e9] pb-6">
                <label
                  htmlFor="retailer-filter"
                  className="mb-2 block text-sm font-semibold text-[#31262b]"
                >
                  {formatInterfaceText(
                    "Retailer",
                  )}
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
                  className={
                    drawerSelectClassName
                  }
                >
                  <option value="">
                    {formatInterfaceText(
                      "All retailers",
                    )}
                  </option>

                  {retailers.map(
                    (retailer) => (
                      <option
                        key={retailer}
                        value={retailer}
                      >
                        {retailer}
                      </option>
                    ),
                  )}
                </select>
              </section>

              <section className="border-b border-[#f2e4e9] py-6">
                <label
                  htmlFor="brand-filter"
                  className="mb-2 block text-sm font-semibold text-[#31262b]"
                >
                  {formatInterfaceText(
                    "Brand",
                  )}
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
                  className={
                    drawerSelectClassName
                  }
                >
                  <option value="">
                    {formatInterfaceText(
                      "All brands",
                    )}
                  </option>

                  {brands.map((brand) => (
                    <option
                      key={brand}
                      value={brand}
                    >
                      {brand}
                    </option>
                  ))}
                </select>
              </section>

              <fieldset className="border-b border-[#f2e4e9] py-6">
                <legend className="mb-3 text-sm font-semibold text-[#31262b]">
                  {formatInterfaceText(
                    "Availability",
                  )}
                </legend>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#f2e4e9] bg-white px-4 py-3 transition hover:border-[#fb99b9]">
                    <span className="text-base text-[#31262b]">
                      {formatInterfaceText(
                        "In stock only",
                      )}
                    </span>

                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(event) =>
                        updateAvailabilityFilter(
                          "stock",
                          event.target
                            .checked,
                        )
                      }
                      className="h-5 w-5 accent-[#fb99b9]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#f2e4e9] bg-white px-4 py-3 transition hover:border-[#fb99b9]">
                    <span className="text-base text-[#31262b]">
                      {formatInterfaceText(
                        "Delivery available",
                      )}
                    </span>

                    <input
                      type="checkbox"
                      checked={deliveryOnly}
                      onChange={(event) =>
                        updateAvailabilityFilter(
                          "delivery",
                          event.target
                            .checked,
                        )
                      }
                      className="h-5 w-5 accent-[#fb99b9]"
                    />
                  </label>
                </div>
              </fieldset>

              <section className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#31262b]">
                    {formatInterfaceText(
                      "Price",
                    )}
                  </h3>

                  <span className="text-sm font-medium text-[#806c74]">
                    £{priceRange.min} – £
                    {priceRange.max}
                  </span>
                </div>

                <div className="relative h-8">
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
                    aria-label="Minimum price"
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
                      const nextMin =
                        Math.min(
                          Number(
                            event
                              .currentTarget
                              .value,
                          ),
                          priceRange.max -
                            1,
                        );

                      setActiveThumb(null);

                      commitPriceRange(
                        nextMin,
                        priceRange.max,
                      );
                    }}
                    onPointerCancel={() =>
                      setActiveThumb(null)
                    }
                    onKeyUp={(event) => {
                      const nextMin =
                        Math.min(
                          Number(
                            event
                              .currentTarget
                              .value,
                          ),
                          priceRange.max -
                            1,
                        );

                      commitPriceRange(
                        nextMin,
                        priceRange.max,
                      );
                    }}
                    onChange={(event) =>
                      handleMinChange(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="price-range-input absolute inset-0 h-8 w-full"
                    style={{
                      zIndex:
                        activeThumb ===
                        "min"
                          ? 4
                          : 3,
                    }}
                  />

                  <input
                    aria-label="Maximum price"
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
                      const nextMax =
                        Math.max(
                          Number(
                            event
                              .currentTarget
                              .value,
                          ),
                          priceRange.min +
                            1,
                        );

                      setActiveThumb(null);

                      commitPriceRange(
                        priceRange.min,
                        nextMax,
                      );
                    }}
                    onPointerCancel={() =>
                      setActiveThumb(null)
                    }
                    onKeyUp={(event) => {
                      const nextMax =
                        Math.max(
                          Number(
                            event
                              .currentTarget
                              .value,
                          ),
                          priceRange.min +
                            1,
                        );

                      commitPriceRange(
                        priceRange.min,
                        nextMax,
                      );
                    }}
                    onChange={(event) =>
                      handleMaxChange(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="price-range-input absolute inset-0 h-8 w-full"
                    style={{
                      zIndex:
                        activeThumb ===
                        "max"
                          ? 4
                          : 2,
                    }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-xs text-[#806c74]">
                  <span>
                    £{safeMinPrice}
                  </span>

                  <span>
                    £{safeMaxPrice}
                  </span>
                </div>
              </section>
            </div>

            <div className="flex items-center gap-3 border-t border-[#f2e4e9] bg-white px-6 py-5">
              <button
                type="button"
                onClick={clearFilters}
                disabled={
                  !hasActiveFilters
                }
                className="min-h-[46px] flex-1 rounded-xl border border-[#f2e4e9] px-4 py-3 text-sm font-semibold text-[#806c74] transition hover:border-[#fb99b9] hover:text-[#31262b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {formatInterfaceText(
                  "Clear all",
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="min-h-[46px] flex-1 rounded-xl bg-[#fb99b9] px-4 py-3 text-sm font-bold text-[#31262b] transition hover:bg-[#f889af] focus:outline-none focus:ring-4 focus:ring-[#ffecef]"
              >
                {formatInterfaceText(
                  "View results",
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @keyframes filter-drawer-in {
          from {
            transform: translateX(-100%);
          }

          to {
            transform: translateX(0);
          }
        }

        @keyframes filter-backdrop-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

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
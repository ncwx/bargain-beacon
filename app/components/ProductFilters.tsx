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
    "w-full appearance-none rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] py-3 pl-4 pr-12 text-base text-[var(--bb-text-primary)] outline-none transition hover:border-[var(--bb-focus)] focus:border-[var(--bb-focus)] focus:ring-4 focus:ring-[var(--bb-focus-ring)]";

  const sortSelectClassName =
    "h-[46px] min-w-[190px] appearance-none rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] py-2.5 pl-4 pr-12 text-sm text-[var(--bb-text-primary)] outline-none transition hover:border-[var(--bb-focus)] focus:border-[var(--bb-focus)] focus:ring-4 focus:ring-[var(--bb-focus-ring)]";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="product-filter-drawer"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 text-sm leading-none text-[var(--bb-text-primary)] transition hover:border-[var(--bb-focus)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-focus-ring)]"
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
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bb-accent-soft)] px-1.5 text-xs font-bold text-[var(--bb-accent-strong)]">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="whitespace-nowrap text-sm font-medium leading-none text-[var(--bb-text-muted)]">
            {formatInterfaceText(
              resultLabel,
            )}
          </span>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <label
            className="shrink-0 text-sm font-medium leading-none text-[var(--bb-text-muted)]"
            htmlFor="sort-products"
          >
            {formatInterfaceText(
              "Sort by",
            )}
          </label>

          <div className="relative flex-1 sm:flex-none">
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
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-primary)]"
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
            className="absolute inset-0"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--bb-text-primary) 30%, transparent)",
              animation:
                "filter-backdrop-in 240ms ease-out",
            }}
          />

          <aside
            id="product-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-drawer-title"
            className="absolute inset-y-0 left-0 flex w-full max-w-[400px] flex-col bg-[var(--bb-background)] text-[var(--bb-text-primary)]"
            style={{
              animation:
                "filter-drawer-in 280ms cubic-bezier(0.25, 0.8, 0.25, 1)",
              boxShadow:
                "var(--bb-shadow-drawer)",
              willChange: "transform",
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--bb-border)] px-6 py-5">
              <div>
                <h2
                  id="filter-drawer-title"
                  className="text-xl font-bold text-[var(--bb-text-primary)]"
                >
                  {formatInterfaceText(
                    "Filters",
                  )}
                </h2>

                <p className="mt-1 text-sm text-[var(--bb-text-muted)]">
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
                className="flex h-10 w-10 items-center justify-center rounded-full text-4xl leading-none text-[var(--bb-text-muted)] transition hover:bg-[var(--bb-surface-soft)] hover:text-[var(--bb-text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--bb-focus-ring)]"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <section className="border-b border-[var(--bb-border)] pb-6">
                <label
                  htmlFor="retailer-filter"
                  className="mb-2 block text-sm font-bold text-[var(--bb-text-primary)]"
                >
                  {formatInterfaceText(
                    "Retailer",
                  )}
                </label>

            <div className="relative">
                <select
                    id="retailer-filter"
                    value={selectedRetailer}
                    onChange={(event) =>
                    updateFilter(
                        "retailer",
                        event.target.value,
                    )
                    }
                    className={drawerSelectClassName}
                >
                    <option value="">
                    {formatInterfaceText(
                        "All retailers",
                    )}
                    </option>

                    {retailers.map((retailer) => (
                    <option
                        key={retailer}
                        value={retailer}
                    >
                        {retailer}
                    </option>
                    ))}
                </select>

                <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-primary)]"
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
              </section>

              <section className="border-b border-[var(--bb-border)] py-6">
                <label
                  htmlFor="brand-filter"
                  className="mb-2 block text-sm font-bold text-[var(--bb-text-primary)]"
                >
                  {formatInterfaceText(
                    "Brand",
                  )}
                </label>

                <div className="relative">
                    <select
                        id="brand-filter"
                        value={selectedBrand}
                        onChange={(event) =>
                        updateFilter(
                            "brand",
                            event.target.value,
                        )
                        }
                        className={drawerSelectClassName}
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

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-primary)]"
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
              </section>

              <section className="border-b border-[var(--bb-border)] py-6">
                <h3 className="mb-3 text-sm font-bold text-[var(--bb-text-primary)]">
                  {formatInterfaceText(
                    "Availability",
                  )}
                </h3>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 transition hover:border-[var(--bb-focus)]">
                    <span className="text-base text-[var(--bb-text-primary)]">
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
                      className="h-5 w-5 accent-[var(--bb-accent)]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3 transition hover:border-[var(--bb-focus)]">
                    <span className="text-base text-[var(--bb-text-primary)]">
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
                      className="h-5 w-5 accent-[var(--bb-accent)]"
                    />
                  </label>
                </div>
              </section>

              <section className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--bb-text-primary)]">
                    {formatInterfaceText(
                      "Price",
                    )}
                  </h3>

                  <span className="text-sm font-medium text-[var(--bb-text-muted)]">
                    £{priceRange.min} – £
                    {priceRange.max}
                  </span>
                </div>

                <div className="relative h-8">
                  <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--bb-border)]" />

                  <div
                    className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--bb-accent)]"
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

                <div className="mt-2 flex justify-between text-xs text-[var(--bb-text-muted)]">
                  <span>
                    £{safeMinPrice}
                  </span>

                  <span>
                    £{safeMaxPrice}
                  </span>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[var(--bb-border)] bg-[var(--bb-surface)] px-6 py-5">
              <button
                type="button"
                onClick={clearFilters}
                disabled={
                  !hasActiveFilters
                }
                className="h-[48px] rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 text-sm font-bold leading-none text-[var(--bb-text-primary)] transition hover:border-[var(--bb-focus)] hover:text-[var(--bb-text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
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
                className="h-[48px] rounded-[var(--bb-radius)] bg-[var(--bb-accent)] px-4 text-sm font-bold leading-none text-[var(--bb-on-accent)] transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[var(--bb-focus-ring)]"
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
          border: 3px solid
            var(--bb-accent);
          border-radius:
            var(--bb-radius-pill);
          background:
            var(--bb-surface);
          box-shadow:
            var(--bb-shadow-control);
          cursor: grab;
          pointer-events: auto;
        }

        .price-range-input::-webkit-slider-thumb:active {
          cursor: grabbing;
          box-shadow:
            0 0 0 4px
              var(--bb-focus-ring),
            var(--bb-shadow-control);
        }

        .price-range-input:focus-visible {
          outline: none;
        }

        .price-range-input:focus-visible::-webkit-slider-thumb {
          box-shadow:
            0 0 0 4px
              var(--bb-focus-ring),
            var(--bb-shadow-control);
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
          border: 3px solid
            var(--bb-accent);
          border-radius:
            var(--bb-radius-pill);
          background:
            var(--bb-surface);
          box-shadow:
            var(--bb-shadow-control);
          cursor: grab;
          pointer-events: auto;
        }

        .price-range-input::-moz-range-thumb:active {
          cursor: grabbing;
          box-shadow:
            0 0 0 4px
              var(--bb-focus-ring),
            var(--bb-shadow-control);
        }
      `}</style>
    </>
  );
}
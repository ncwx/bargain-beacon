"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(currentQuery);

  // keep the input synced when navigating backwards/forwards
  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  // update the URL shortly after the user stops typing
  useEffect(() => {
    if (query === currentQuery) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      } else {
        params.delete("q");
      }

      const queryString = params.toString();

      router.replace(
        queryString ? `${pathname}?${queryString}` : pathname,
        { scroll: false },
      );
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, currentQuery, pathname, router, searchParams]);

  return (
    <div className="relative w-full">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d747e]"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>

      <label htmlFor="product-search" className="sr-only">
        search products
      </label>

      <input
        id="product-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="search products, brands or retailers..."
        autoComplete="off"
        className="
          w-full rounded-2xl border border-[#f1dce3]
          bg-white py-3 pl-11 pr-11
          text-sm text-[#31262b]
          outline-none transition
          placeholder:text-[#a58f97]
          focus:border-[#fb99b9]
          focus:ring-4 focus:ring-[#ffecef]
        "
      />

      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="clear search"
          className="
            absolute right-4 top-1/2 -translate-y-1/2
            text-lg leading-none text-[#8d747e]
            transition hover:text-[#31262b]
          "
        >
          ×
        </button>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { formatInterfaceText } from "@/config/design";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery =
    searchParams.get("q") ?? "";

  const searchParamsString =
    searchParams.toString();

  const [query, setQuery] =
    useState(currentQuery);

  /*
   * Keep the input synchronised when the user
   * navigates backwards or forwards.
   */
  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  /*
   * Update the URL shortly after the user stops typing.
   * router.replace avoids creating a browser-history
   * entry for every individual character.
   */
  useEffect(() => {
    if (query === currentQuery) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        const params =
          new URLSearchParams(
            searchParamsString,
          );

        const trimmedQuery =
          query.trim();

        if (trimmedQuery) {
          params.set(
            "q",
            trimmedQuery,
          );
        } else {
          params.delete("q");
        }

        const queryString =
          params.toString();

        router.replace(
          queryString
            ? `${pathname}?${queryString}`
            : pathname,
          {
            scroll: false,
          },
        );
      },
      250,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    query,
    currentQuery,
    pathname,
    router,
    searchParamsString,
  ]);

  function clearSearch() {
    setQuery("");
  }

  return (
    <div className="relative w-full">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-muted)]"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
        />

        <path d="m20 20-3.5-3.5" />
      </svg>

      <label
        htmlFor="product-search"
        className="sr-only"
      >
        Search products
      </label>

      <input
        id="product-search"
        type="text"
        value={query}
        onChange={(event) =>
          setQuery(event.target.value)
        }
        placeholder={formatInterfaceText(
          "Search products, brands or retailers...",
        )}
        autoComplete="off"
        spellCheck={false}
        className="
          h-[48px]
          w-full
          rounded-[var(--bb-radius)]
          border
          border-[var(--bb-border)]
          bg-[var(--bb-surface)]
          py-3
          pl-11
          pr-12
          text-sm
          text-[var(--bb-text-primary)]
          outline-none
          transition
          placeholder:text-[var(--bb-text-placeholder)]
          hover:border-[var(--bb-focus)]
          focus:border-[var(--bb-focus)]
          focus:ring-4
          focus:ring-[var(--bb-focus-ring)]
        "
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="
            absolute
            right-3
            top-1/2
            flex
            h-8
            w-8
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            text-xl
            leading-none
            text-[var(--bb-text-muted)]
            transition
            hover:bg-[var(--bb-accent-soft)]
            hover:text-[var(--bb-text-primary)]
            focus:outline-none
            focus:ring-4
            focus:ring-[var(--bb-focus-ring)]
          "
        >
          ×
        </button>
      )}
    </div>
  );
}
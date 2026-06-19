"use client";

import {
  useEffect,
  useRef,
} from "react";
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

  const inputRef =
    useRef<HTMLInputElement>(null);

  const debounceRef =
    useRef<number | null>(null);

  function navigateToQuery(
    nextQuery: string,
  ) {
    const trimmedQuery =
      nextQuery.trim();

    if (trimmedQuery === currentQuery) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParamsString,
      );

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
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
  }

  function scheduleQueryUpdate(
    nextQuery: string,
  ) {
    if (debounceRef.current !== null) {
      window.clearTimeout(
        debounceRef.current,
      );
    }

    debounceRef.current =
      window.setTimeout(() => {
        navigateToQuery(nextQuery);
        debounceRef.current = null;
      }, 250);
  }

  /*
   * Synchronise the actual input element when
   * browser back/forward navigation changes
   * the query string.
   */
  useEffect(() => {
    const input = inputRef.current;

    if (
      input &&
      input.value !== currentQuery
    ) {
      input.value = currentQuery;
    }
  }, [currentQuery]);

  useEffect(() => {
    return () => {
      if (
        debounceRef.current !== null
      ) {
        window.clearTimeout(
          debounceRef.current,
        );
      }
    };
  }, []);

  function clearSearch() {
    if (debounceRef.current !== null) {
      window.clearTimeout(
        debounceRef.current,
      );

      debounceRef.current = null;
    }

    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }

    navigateToQuery("");
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
        ref={inputRef}
        id="product-search"
        type="text"
        defaultValue={currentQuery}
        onChange={(event) =>
          scheduleQueryUpdate(
            event.currentTarget.value,
          )
        }
        placeholder={formatInterfaceText(
          "Search products, brands or retailers...",
        )}
        autoComplete="off"
        spellCheck={false}
        className="
          peer
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
          opacity-100
          transition
          hover:bg-[var(--bb-accent-soft)]
          hover:text-[var(--bb-on-accent-soft)]
          focus:outline-none
          focus:ring-4
          focus:ring-[var(--bb-focus-ring)]
          peer-placeholder-shown:pointer-events-none
          peer-placeholder-shown:opacity-0
        "
      >
        ×
      </button>
    </div>
  );
}
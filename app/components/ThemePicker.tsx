"use client";

import {
  type SelectableThemeName,
} from "@/config/design";

import {
  useTheme,
} from "@/app/components/ThemeProvider";

const themeOptions = [
  {
    value: "blush",
    label: "Blush",
  },
    {
        value: "ocean",
        label: "Ocean",
    },
] as const satisfies ReadonlyArray<{
  value: SelectableThemeName;
  label: string;
}>;

function isThemeOption(
  value: string,
): value is SelectableThemeName {
  return themeOptions.some(
    (option) => option.value === value,
  );
}

export default function ThemePicker() {
  const {
    theme,
    setTheme,
  } = useTheme();

  function handleThemeChange(
    value: string,
  ) {
    if (!isThemeOption(value)) {
      return;
    }

    setTheme(value);
  }

  return (
    <label className="relative flex h-[48px] shrink-0 items-center rounded-[var(--bb-radius)] border border-[var(--bb-border)] bg-[var(--bb-surface)] transition hover:border-[var(--bb-focus)]">
      <span className="sr-only">
        Colour theme
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 h-3.5 w-3.5 rounded-full bg-[var(--bb-accent)]"
      />

      <select
        value={theme}
        onChange={(event) =>
          handleThemeChange(
            event.target.value,
          )
        }
        aria-label="Colour theme"
        className="h-full min-w-[132px] appearance-none rounded-[var(--bb-radius)] bg-transparent pl-10 pr-10 text-sm font-semibold text-[var(--bb-text-primary)] outline-none focus:ring-4 focus:ring-[var(--bb-focus-ring)]"
      >
        {themeOptions.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ),
        )}
      </select>

      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 h-4 w-4 text-[var(--bb-text-muted)]"
      >
        <path d="m6 8 4 4 4-4" />
      </svg>
    </label>
  );
}
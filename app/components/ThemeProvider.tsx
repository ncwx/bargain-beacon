"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  THEME_COOKIE_NAME,
  type SelectableThemeName,
} from "@/config/design";

type ThemeContextValue = {
  theme: SelectableThemeName;
  setTheme: (
    theme: SelectableThemeName,
  ) => void;
};

type ThemeProviderProps = {
  initialTheme: SelectableThemeName;
  children: ReactNode;
};

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null,
  );

export function ThemeProvider({
  initialTheme,
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] =
    useState<SelectableThemeName>(
      initialTheme,
    );

  const setTheme = useCallback(
    (
      newTheme: SelectableThemeName,
    ) => {
      document.documentElement.dataset.theme =
        newTheme;

      const secureAttribute =
        window.location.protocol ===
        "https:"
          ? "; Secure"
          : "";

      document.cookie = [
        `${THEME_COOKIE_NAME}=${encodeURIComponent(
          newTheme,
        )}`,
        "Path=/",
        "Max-Age=31536000",
        "SameSite=Lax",
      ].join("; ") + secureAttribute;

      setThemeState(newTheme);
    },
    [],
  );

  const contextValue =
    useMemo<ThemeContextValue>(
      () => ({
        theme,
        setTheme,
      }),
      [theme, setTheme],
    );

  return (
    <ThemeContext.Provider
      value={contextValue}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider.",
    );
  }

  return context;
}
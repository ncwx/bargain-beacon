import type { Metadata } from "next";
import { cookies } from "next/headers";

import {
  design,
  isSelectableThemeName,
  THEME_COOKIE_NAME,
  type SelectableThemeName,
} from "@/config/design";

import {
  ThemeProvider,
} from "@/app/components/ThemeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "bargain beacon",
  description:
    "find the best-value products across retailers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const savedTheme =
    cookieStore.get(
      THEME_COOKIE_NAME,
    )?.value;

  const defaultTheme: SelectableThemeName =
    isSelectableThemeName(
      design.theme,
    )
      ? design.theme
      : "blush";

  const initialTheme: SelectableThemeName =
    isSelectableThemeName(savedTheme)
      ? savedTheme
      : defaultTheme;

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-theme={initialTheme}
      data-casing={design.casing}
      data-radius={design.radius}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          initialTheme={initialTheme}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
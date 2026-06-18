import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { design } from "@/config/design";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bargain beacon",
  description:
    "find the best-value products across retailers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={design.theme}
      data-casing={design.casing}
      data-font={design.font}
      data-radius={design.radius}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
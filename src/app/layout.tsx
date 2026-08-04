import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

// Runs before hydration so the page never paints the wrong theme and then
// flips -- must read the same localStorage key as THEME_STORAGE_KEY in
// src/lib/theme.tsx (duplicated here as a literal since this script can't
// import that module: it has to run standalone, before any JS bundle loads).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem("nclex-theme");
    var isDark = pref === "dark" || (pref !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

const pixelFont = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NCLEX-RN Flashcards",
  description: "A simple flashcard app for NCLEX-RN test prep",
};

// viewportFit: "cover" is what makes env(safe-area-inset-bottom) report a
// real value on iOS instead of 0, so we can pad around the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pixelFont.variable} ${bodyFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

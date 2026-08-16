import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, IBM_Plex_Mono, Space_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import { FontProvider } from "@/lib/font";
import { TooltipProvider } from "@/components/ui/shadcn/tooltip";
import "./globals.css";

// Runs before hydration so the page never paints the wrong theme and then
// flips -- must read the same localStorage key as THEME_STORAGE_KEY in
// src/lib/theme.tsx (duplicated here as a literal since this script can't
// import that module: it has to run standalone, before any JS bundle loads).
// The font read/apply is bundled into the same script (one parse, not two)
// -- must stay in sync with FONT_STORAGE_KEY/FONT_CLASSES in src/lib/font.tsx.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem("nclex-theme");
    var isDark = pref === "dark" || (pref !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
  try {
    var fontPref = localStorage.getItem("nclex-font");
    var fontClass = fontPref === "plex" ? "font-plex" : fontPref === "space" ? "font-space" : "font-jetbrains";
    document.documentElement.classList.add(fontClass);
  } catch (e) {}
})();
`;

// All three loaded simultaneously as separate CSS variables so switching
// the active mono font (FontToggle) is a pure `--font-mono` custom-property
// remap via a `.font-*` class on <html> -- no runtime font fetch on switch,
// see the design-tokens section of the plan doc.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      className={`${jetbrainsMono.variable} ${ibmPlexMono.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <FontProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

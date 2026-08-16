"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { fetchFontPreference, saveFontPreference, FontPreference } from "@/services/settings";

// Must match the key the blocking inline script in layout.tsx reads before
// hydration -- that script is what avoids a flash of the wrong font on
// load, and it can't import this module (it runs before any JS bundle).
export const FONT_STORAGE_KEY = "nclex-font";

const FONT_CLASSES: Record<FontPreference, string> = {
  jetbrains: "font-jetbrains",
  plex: "font-plex",
  space: "font-space",
};

function isFontPreference(value: string | null): value is FontPreference {
  return value === "jetbrains" || value === "plex" || value === "space";
}

type FontContextValue = {
  font: FontPreference;
  setFont: (next: FontPreference) => void;
};

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontPreference>(() => {
    const cached = typeof window === "undefined" ? null : localStorage.getItem(FONT_STORAGE_KEY);
    return isFontPreference(cached) ? cached : "jetbrains";
  });
  const session = useSession();

  // Once signed in, the account's saved preference is the source of truth
  // (it may differ from this device's cached value if it was changed on
  // another device), so it wins over whatever was cached locally.
  useEffect(() => {
    if (!session) return;
    fetchFontPreference()
      .then((remote) => {
        if (remote) {
          setFontState(remote);
          localStorage.setItem(FONT_STORAGE_KEY, remote);
        }
      })
      .catch((err) => console.error("Failed to fetch font preference:", err));
  }, [session]);

  useEffect(() => {
    const html = document.documentElement;
    for (const cls of Object.values(FONT_CLASSES)) html.classList.remove(cls);
    html.classList.add(FONT_CLASSES[font]);
  }, [font]);

  const setFont = useCallback(
    (next: FontPreference) => {
      setFontState(next);
      localStorage.setItem(FONT_STORAGE_KEY, next);
      if (session) {
        saveFontPreference(next).catch((err) => console.error("Failed to save font preference:", err));
      }
    },
    [session],
  );

  return <FontContext.Provider value={{ font, setFont }}>{children}</FontContext.Provider>;
}

export function useFont(): FontContextValue {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within a FontProvider");
  return ctx;
}

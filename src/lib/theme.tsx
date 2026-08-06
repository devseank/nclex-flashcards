"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { fetchThemePreference, saveThemePreference, ThemePreference } from "@/services/settings";

// Must match the key the blocking inline script in layout.tsx reads before
// hydration -- that script is what avoids a flash of the wrong theme on
// load, and it can't import this module (it runs before any JS bundle).
export const THEME_STORAGE_KEY = "nclex-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark";
}

// Only ever called once, for a user with no stored preference yet (new
// device, or pre-existing account from before this was a plain light/dark
// choice) -- picks a starting point from the OS setting, but the result is
// then saved as a real "light"/"dark" choice, never re-checked against the
// OS again. There's no persistent "system" mode to fall back into.
function resolveInitialTheme(): ThemePreference {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const cached = typeof window === "undefined" ? null : localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(cached) ? cached : resolveInitialTheme();
  });
  const session = useSession();

  // Once signed in, the account's saved preference is the source of truth
  // (it may differ from this device's cached value if it was changed on
  // another device), so it wins over whatever was cached locally.
  useEffect(() => {
    if (!session) return;
    fetchThemePreference()
      .then((remote) => {
        if (remote) {
          setThemeState(remote);
          localStorage.setItem(THEME_STORAGE_KEY, remote);
        }
      })
      .catch((err) => console.error("Failed to fetch theme preference:", err));
  }, [session]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      if (session) {
        saveThemePreference(next).catch((err) => console.error("Failed to save theme preference:", err));
      }
    },
    [session],
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

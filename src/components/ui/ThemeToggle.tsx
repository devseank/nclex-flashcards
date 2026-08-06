"use client";

import { useTheme } from "@/lib/theme";
import { useHasMounted } from "@/lib/useHasMounted";
import { ThemePreference } from "@/services/settings";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "SYSTEM" },
  { value: "light", label: "LIGHT" },
  { value: "dark", label: "DARK" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The active option depends on localStorage, which the server can't see
  // -- rendering that before mount would mismatch the static HTML. All
  // three render as inactive until mounted, then the real state takes over.
  const mounted = useHasMounted();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const isActive = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            className={`nes-btn ${isActive ? "is-primary" : ""} font-pixel text-[9px] py-2`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

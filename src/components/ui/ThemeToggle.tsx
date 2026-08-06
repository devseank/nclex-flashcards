"use client";

import { useTheme } from "@/lib/theme";
import { useHasMounted } from "@/lib/useHasMounted";
import { ThemePreference } from "@/services/settings";
import { Sun, Moon } from "@nsmr/pixelart-react";

// @nsmr/pixelart-react, not a hand-rolled SVG -- its 24x24 blocky icons
// already match nes.css's own pixel-art grain, and it's the only free
// pixel-icon package found with a genuine standalone Sun (the more popular
// `pixelarticons` only ships a sun *combined with a cloud* in its free
// tier, no plain sun).
const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light mode", Icon: Sun },
  { value: "dark", label: "Dark mode", Icon: Moon },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The active option depends on localStorage, which the server can't see
  // -- rendering that before mount would mismatch the static HTML. Both
  // render as inactive until mounted, then the real state takes over.
  const mounted = useHasMounted();

  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={`nes-btn ${isActive ? "is-primary" : ""} flex items-center justify-center py-2`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useFont } from "@/lib/font";
import { useHasMounted } from "@/lib/useHasMounted";
import { FontPreference } from "@/services/settings";
import { cn } from "@/lib/utils";

// Each button's own label is rendered in the font it selects -- a live
// preview instead of an icon, since no icon meaningfully distinguishes three
// mono typefaces from one another the way Sun/Moon does for ThemeToggle.
const OPTIONS: { value: FontPreference; label: string; cssVar: string }[] = [
  { value: "jetbrains", label: "Aa", cssVar: "var(--font-jetbrains-mono)" },
  { value: "plex", label: "Aa", cssVar: "var(--font-ibm-plex-mono)" },
  { value: "space", label: "Aa", cssVar: "var(--font-space-mono)" },
];

export default function FontToggle() {
  const { font, setFont } = useFont();

  // The active option depends on localStorage, which the server can't see
  // -- rendering that before mount would mismatch the static HTML. All
  // render as inactive until mounted, then the real state takes over.
  const mounted = useHasMounted();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ value, label, cssVar }) => {
        const isActive = mounted && font === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setFont(value)}
            aria-pressed={isActive}
            aria-label={value}
            title={value}
            className={cn(
              "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm py-2 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]",
              isActive && "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]",
            )}
            style={{ fontFamily: cssVar }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

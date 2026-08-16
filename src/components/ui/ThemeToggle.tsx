"use client";

import { useTheme } from "@/lib/theme";
import { useHasMounted } from "@/lib/useHasMounted";
import { ThemePreference } from "@/services/settings";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

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
            className={cn(
              "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] flex items-center justify-center py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]",
              isActive && "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]",
            )}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

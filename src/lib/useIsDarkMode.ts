"use client";

import { useEffect, useState } from "react";

// recharts renders plain SVG with whatever color values it's given at
// render time -- it has no idea about CSS custom properties, so passing
// `var(--text-navy)` as a stroke/fill prop won't update when the theme
// toggles (recharts never re-renders just because a CSS variable changed
// underneath it). This hook makes the *prop value itself* change on a real
// re-render by watching the `.dark` class ThemeProvider toggles on <html>.
export function useIsDarkMode(): boolean {
  // Lazy initializer, not a setState call in the effect body below -- the
  // effect only ever subscribes to the MutationObserver and lets *its*
  // callback drive updates, which is what react-hooks/set-state-in-effect
  // actually wants (sync external state via a subscription, not a direct
  // setState in the effect body itself).
  const [isDark, setIsDark] = useState(() =>
    typeof document === "undefined" ? false : document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

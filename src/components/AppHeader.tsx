"use client";

import AccountMenu from "@/components/auth/AccountMenu";

// Global chrome, rendered once above every view (menu, filter/review/new
// pickers, a live question, analytics, finished, ...) rather than only
// inside the home screen's own MENU.EXE window -- account/display settings
// should be reachable from anywhere, not just after navigating back to the
// menu. Sticky, not fixed: it should scroll away and reappear naturally
// like a normal in-flow element, just staying pinned once it reaches the
// top -- same z-40 chrome tier as StickyNextBar (session/StickyNextBar.tsx),
// which sits at the opposite edge of the screen so they never overlap.
export default function AppHeader() {
  return (
    <div className="sticky top-0 z-40 w-full flex justify-end px-4 py-2">
      <AccountMenu />
    </div>
  );
}

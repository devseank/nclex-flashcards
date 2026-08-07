"use client";

import { createContext, useContext } from "react";

// Carries useQuizSession's `goToMenu` down to HeaderActions (rendered from
// deep inside PixelWindow/FlashcardShell/TitleBar instances across every
// screen) without threading an `onHome` prop through every intermediate
// component signature in between -- this is the textbook case for context:
// one action, needed almost everywhere, completely unrelated to what any of
// those intermediate components actually do. FlashcardApp.tsx (and its dev
// counterpart) are the only providers; every screen they render is already
// inside one.
const GoToMenuContext = createContext<(() => void) | null>(null);

export function GoToMenuProvider({
  goToMenu,
  children,
}: {
  goToMenu: () => void;
  children: React.ReactNode;
}) {
  return <GoToMenuContext.Provider value={goToMenu}>{children}</GoToMenuContext.Provider>;
}

// Falls back to a no-op rather than throwing if ever rendered outside the
// provider -- the Home button is a shortcut on top of already-working
// browser/hardware back, not the only way home, so a silently-inert button
// is a safer failure mode here than crashing the screen it's on.
export function useGoToMenu(): () => void {
  return useContext(GoToMenuContext) ?? (() => {});
}

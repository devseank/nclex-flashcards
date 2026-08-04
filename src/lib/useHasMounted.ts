"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Returns false during the server-rendered/pre-hydration pass and true
// after, without an effect+setState (which the set-state-in-effect lint
// rule flags) -- useSyncExternalStore's getServerSnapshot/getSnapshot split
// is the React-native way to express "value differs before vs. after
// hydration."
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

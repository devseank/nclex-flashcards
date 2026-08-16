import { Home } from "lucide-react";

// Icon button matching AccountMenu's own hamburger button's exact footprint
// so the two sit flush as one visual pair in a header bar -- an explicit
// "jump straight back to the main menu" action, distinct from browser/
// hardware back (which just retraces whatever history entries got pushed,
// see useQuizSession.ts's goToMenu).
export default function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Home"
      title="Back to menu"
      className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] leading-none p-1.5 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
    >
      <Home size={16} />
    </button>
  );
}

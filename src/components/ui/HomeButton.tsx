import { Home } from "@nsmr/pixelart-react";

// Icon button matching AccountMenu's own hamburger button's exact 32x28
// footprint so the two sit flush as one visual pair in a header bar -- an
// explicit "jump straight back to the main menu" action, distinct from
// browser/hardware back (which just retraces whatever history entries got
// pushed, see useQuizSession.ts's goToMenu). AccountMenu's button gets its
// 28px height from a 12px-tall 3-bar stack (not a 16px icon) under the same
// p-1.5 -- matching padding here would make this one 32x32 (4px taller), so
// the vertical padding is trimmed to py-1 specifically to compensate.
export default function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Home"
      title="Back to menu"
      className="cursor-pointer bg-[#faf1de] text-black border-2 border-black leading-none px-1.5 py-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-navy-strong)]"
    >
      <Home size={16} />
    </button>
  );
}

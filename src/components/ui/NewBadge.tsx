// Corner ribbon shown on questions with no attempt history yet. Reuses
// nes-btn's chunky pixel border/shadow (is-warning gives the gold color)
// instead of custom CSS, on a <span> (not a real button) so it's purely
// decorative -- no focus, no click. `.shine-sweep` (globals.css) adds the
// periodic sweep; `overflow-hidden` clips it to the badge's own bounds.
export default function NewBadge({ inset = false }: { inset?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`nes-btn is-warning shine-sweep absolute rotate-6 py-1 px-2 font-pixel text-[9px] text-black select-none pointer-events-none overflow-hidden ${
        // `inset`: tucked just inside the card's own top-right corner rather
        // than poking out above it -- for FlashcardShell's headered variant
        // (live session, history detail), where poking out would land the
        // ribbon on top of the header bar's account-menu hamburger, which
        // sits in that same corner.
        inset ? "top-2 right-2" : "-top-3 -right-3"
      }`}
    >
      NEW
    </span>
  );
}

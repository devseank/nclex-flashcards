// Corner ribbon shown on questions with no attempt history yet. Reuses
// nes-btn's chunky pixel border/shadow (is-warning gives the gold color)
// instead of custom CSS, on a <span> (not a real button) so it's purely
// decorative -- no focus, no click. `.shine-sweep` (globals.css) adds the
// periodic sweep; `overflow-hidden` clips it to the badge's own bounds.
export default function NewBadge() {
  return (
    <span
      aria-hidden="true"
      className="nes-btn is-warning shine-sweep absolute -top-3 -right-3 rotate-6 py-1 px-2 font-pixel text-[9px] text-black select-none pointer-events-none overflow-hidden"
    >
      NEW
    </span>
  );
}

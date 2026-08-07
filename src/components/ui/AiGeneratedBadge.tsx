// Corner ribbon shown on questions whose choices/rationale (or both) were
// written by an AI rather than transcribed from the source -- see
// ai_generated in supabase/schema.sql for why this exists. Opposite corner
// from NewBadge (-left- vs -right-) since a question can be both "new" (no
// attempt history) and AI-generated at once.
export default function AiGeneratedBadge({ inset = false }: { inset?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`nes-btn is-error absolute -rotate-6 py-1 px-2 font-pixel text-[9px] select-none pointer-events-none ${
        // `inset`: tucked just inside the card's own top-left corner rather
        // than poking out above it -- for FlashcardShell's headered variant
        // (live session, history detail), where poking out would land the
        // ribbon on top of the header bar's own left-side label.
        inset ? "top-2 left-2" : "-top-3 -left-3"
      }`}
      title="Choices and/or rationale for this question were written by an AI, not transcribed from the source"
    >
      AI
    </span>
  );
}

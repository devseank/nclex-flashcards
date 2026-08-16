"use client";

// A small header above a group of related menu buttons, so this home screen
// reads as organized sections instead of one long wall of buttons.
function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">{children}</p>;
}

const BUTTON_BASE =
  "relative border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[10px] uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]";

// No toggle/expand step here -- this component is only ever rendered as the
// home screen's own content (already inside a "MENU.EXE" window), so
// hiding it behind its own extra "open menu" tap was a redundant step.
export default function Landing({
  onSelectPlay,
  onSelectFilter,
  onSelectReview,
  onSelectNew,
  onSelectHistory,
  onSelectAnalytics,
}: {
  onSelectPlay: () => void;
  onSelectFilter: () => void;
  onSelectReview: () => void;
  onSelectNew: () => void;
  onSelectHistory: () => void;
  onSelectAnalytics: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionLabel>PLAY</SectionLabel>
        <button
          type="button"
          onClick={onSelectPlay}
          className="shine-sweep relative w-full overflow-hidden border border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)] font-mono text-sm uppercase tracking-wider py-3 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          <span aria-hidden="true">▶</span> PLAY
        </button>
      </div>

      <div className="space-y-2">
        <SectionLabel>FILTER</SectionLabel>
        <button type="button" onClick={onSelectFilter} className={`${BUTTON_BASE} w-full`}>
          FILTER
        </button>
      </div>

      <div className="space-y-2">
        <SectionLabel>SMART REVIEW</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onSelectReview} className={BUTTON_BASE}>
            REVIEW
          </button>
          <button type="button" onClick={onSelectNew} className={BUTTON_BASE}>
            NEW
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onSelectHistory} className={BUTTON_BASE}>
          HISTORY
        </button>
        <button type="button" onClick={onSelectAnalytics} className={BUTTON_BASE}>
          ANALYTICS
        </button>
      </div>
    </div>
  );
}

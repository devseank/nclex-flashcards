"use client";

import ThemeToggle from "@/components/ThemeToggle";

// A small pixel-font header above a group of related menu buttons, so this
// home screen reads as organized sections instead of one long wall of
// buttons.
function SectionLabel({ children }: { children: string }) {
  return <p className="font-pixel text-[9px] text-gray-400">{children}</p>;
}

// No toggle/expand step here -- this component is only ever rendered as the
// home screen's own content (already inside a "MENU.EXE" window), so
// hiding it behind its own extra "open menu" tap was a redundant step.
export default function Landing({
  onSelectPlay,
  onSelectCategory,
  onSelectType,
  onSelectReview,
  onSelectNew,
  onSelectHistory,
  onSelectAnalytics,
}: {
  onSelectPlay: () => void;
  onSelectCategory: () => void;
  onSelectType: () => void;
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
          className="shine-sweep nes-btn is-primary w-full overflow-hidden font-pixel text-sm py-3 flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">▶</span> PLAY
        </button>
      </div>

      <div className="space-y-2">
        <SectionLabel>FILTER</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSelectCategory}
            className="nes-btn is-warning font-pixel text-[10px] py-2"
          >
            CATEGORY
          </button>
          <button
            type="button"
            onClick={onSelectType}
            className="nes-btn font-pixel text-[10px] py-2"
          >
            TYPE
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel>SMART REVIEW</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSelectReview}
            className="nes-btn is-error font-pixel text-[10px] py-2"
          >
            REVIEW
          </button>
          <button
            type="button"
            onClick={onSelectNew}
            className="nes-btn is-primary font-pixel text-[10px] py-2"
          >
            NEW
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSelectHistory}
          className="nes-btn is-warning font-pixel text-[10px] py-2"
        >
          HISTORY
        </button>
        <button
          type="button"
          onClick={onSelectAnalytics}
          className="nes-btn is-success font-pixel text-[10px] py-2"
        >
          ANALYTICS
        </button>
      </div>

      <div className="space-y-2">
        <SectionLabel>DISPLAY</SectionLabel>
        <ThemeToggle />
      </div>
    </div>
  );
}

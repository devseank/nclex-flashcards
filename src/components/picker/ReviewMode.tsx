"use client";

export type ReviewRange = "today" | "week" | "all" | "stale";

const RANGE_OPTIONS: { key: ReviewRange; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "THIS WEEK" },
  { key: "all", label: "ALL TIME" },
  { key: "stale", label: "LEAST RECENT" },
];

export default function ReviewMode({
  onSelect,
  onBack,
}: {
  onSelect: (range: ReviewRange) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className="nes-btn is-error w-full font-pixel text-xs py-2"
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onBack}
        className="font-pixel text-[10px] text-[var(--text-navy)] underline"
      >
        ← MENU
      </button>
    </div>
  );
}

"use client";

export type HistoryLimit = 5 | 20 | 100;

const LIMIT_OPTIONS: { key: HistoryLimit; label: string }[] = [
  { key: 5, label: "LAST 5" },
  { key: 20, label: "LAST 20" },
  { key: 100, label: "LAST 100" },
];

export default function HistoryMode({
  onSelect,
  onBack,
}: {
  onSelect: (limit: HistoryLimit) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      {LIMIT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className="nes-btn w-full font-pixel text-xs py-2"
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

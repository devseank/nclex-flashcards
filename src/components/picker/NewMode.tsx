"use client";

export type NewRange = "today" | "week" | "all";

const RANGE_OPTIONS: { key: NewRange; label: string }[] = [
  { key: "today", label: "NEW" },
  { key: "week", label: "NEWER" },
  { key: "all", label: "NEWEST" },
];

export default function NewMode({
  onSelect,
}: {
  onSelect: (range: NewRange) => void;
}) {
  return (
    <div className="space-y-3">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className="nes-btn is-success w-full font-pixel text-xs py-2"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
          className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono w-full text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
}: {
  onSelect: (range: ReviewRange) => void;
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

"use client";

export type HistoryLimit = 5 | 20 | 100;

const LIMIT_OPTIONS: { key: HistoryLimit; label: string }[] = [
  { key: 5, label: "LAST 5" },
  { key: 20, label: "LAST 20" },
  { key: 100, label: "LAST 100" },
];

export default function HistoryMode({
  onSelect,
}: {
  onSelect: (limit: HistoryLimit) => void;
}) {
  return (
    <div className="space-y-3">
      {LIMIT_OPTIONS.map((opt) => (
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

"use client";

import { Question } from "@/services/questions";
import { Attempt } from "@/services/attempts";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";

export type HistoryEntry = { attempt: Attempt; question: Question };

export default function HistoryList({
  entries,
  onSelect,
}: {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
}) {
  return (
    <PixelWindow title="HISTORY.EXE" headerAction={<HeaderActions />} wide>
      <div className="space-y-2">
        {entries.map(({ attempt, question }) => (
          <button
            key={attempt.id}
            type="button"
            onClick={() => onSelect({ attempt, question })}
            className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono w-full text-left py-2 px-3 flex items-center gap-2 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            <span
              className={`shrink-0 text-sm ${attempt.isCorrect ? "text-[var(--signal)]" : "text-[var(--muted-foreground)]"}`}
              aria-label={attempt.isCorrect ? "Correct" : "Incorrect"}
            >
              {attempt.isCorrect ? "✓" : "✕"}
            </span>
            <span className="shrink-0 text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">{question.category}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{question.question}</span>
          </button>
        ))}
      </div>
    </PixelWindow>
  );
}

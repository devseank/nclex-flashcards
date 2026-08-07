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
            className="nes-btn w-full text-left flex items-center gap-2 overflow-hidden"
          >
            <span
              className={`shrink-0 font-pixel text-sm ${attempt.isCorrect ? "text-green-600" : "text-red-600"}`}
              aria-label={attempt.isCorrect ? "Correct" : "Incorrect"}
            >
              {attempt.isCorrect ? "●" : "✗"}
            </span>
            <span className="shrink-0 font-pixel text-[9px] text-gray-500">{question.category}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{question.question}</span>
          </button>
        ))}
      </div>
    </PixelWindow>
  );
}

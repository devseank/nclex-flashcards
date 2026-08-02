"use client";

import QuestionCard from "@/components/QuestionCard";
import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { SessionMode } from "@/lib/quizLogic";

export default function SessionScreen({
  mode,
  current,
  index,
  queueLength,
  stats,
  onNext,
  onBack,
}: {
  mode: SessionMode;
  current: Question;
  index: number;
  queueLength: number;
  stats?: QuestionStats;
  onNext: (selected: number[]) => void;
  onBack: () => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          className="font-pixel text-[10px] text-[#33415c] underline"
        >
          ← MENU
        </button>
        {mode !== "infinite" && (
          <span className="font-pixel text-[10px] text-[#33415c]">
            {index + 1} / {queueLength}
          </span>
        )}
      </div>
      <QuestionCard key={current.id} question={current} onNext={onNext} stats={stats} />
    </div>
  );
}

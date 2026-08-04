"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import QuestionCard from "@/components/QuestionCard";

export default function HistoryDetail({
  question,
  response,
  stats,
  onBack,
}: {
  question: Question;
  response: number[];
  stats?: QuestionStats;
  onBack: () => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <div className="w-full flex items-center px-1">
        <button
          type="button"
          onClick={onBack}
          className="font-pixel text-[10px] text-[var(--text-navy)] underline"
        >
          ← HISTORY
        </button>
      </div>
      <QuestionCard question={question} mode="review" initialResponse={response} stats={stats} />
    </div>
  );
}

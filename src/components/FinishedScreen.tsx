"use client";

import Flashcard from "@/components/Flashcard";
import PixelWindow from "@/components/PixelWindow";
import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";

export default function FinishedScreen({
  title,
  score,
  total,
  queue,
  answers,
  questionStats,
  onBackToMenu,
}: {
  title: string;
  score: number;
  total: number;
  queue: Question[];
  answers: number[][];
  questionStats: Map<number, QuestionStats> | null;
  onBackToMenu: () => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <PixelWindow title="DONE.EXE">
        <p className="text-base">
          You scored {score} / {total} on {title}.
        </p>
        <button
          type="button"
          onClick={onBackToMenu}
          className="nes-btn is-primary w-full font-pixel text-xs py-2"
        >
          BACK TO MENU
        </button>
      </PixelWindow>

      <div className="w-full flex flex-col gap-4">
        {queue.map((q, i) => (
          <Flashcard
            key={q.id}
            question={q}
            mode="review"
            initialSelected={answers[i] ?? []}
            stats={questionStats?.get(q.id)}
          />
        ))}
      </div>
    </div>
  );
}

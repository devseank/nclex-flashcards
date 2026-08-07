"use client";

import QuestionCard from "@/components/session/QuestionCard";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";
import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { QuestionResponse } from "@/lib/quizLogic";

export default function FinishedScreen({
  title,
  score,
  total,
  queue,
  answers,
  questionStats,
}: {
  title: string;
  score: number;
  total: number;
  queue: Question[];
  answers: QuestionResponse[];
  questionStats: Map<number, QuestionStats> | null;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <PixelWindow title="DONE.EXE" headerAction={<HeaderActions />}>
        <p className="text-base">
          You scored {score} / {total} on {title}.
        </p>
      </PixelWindow>

      <div className="w-full flex flex-col gap-4">
        {queue.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            mode="review"
            initialResponse={answers[i] ?? []}
            stats={questionStats?.get(q.id)}
          />
        ))}
      </div>
    </div>
  );
}

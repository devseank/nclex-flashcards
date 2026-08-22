"use client";

import QuestionCard from "@/components/session/QuestionCard";
import HeaderActions from "@/components/ui/HeaderActions";
import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { Note } from "@/services/notes";
import { SessionMode, QuestionResponse } from "@/lib/quizLogic";

export default function SessionScreen({
  mode,
  current,
  index,
  queueLength,
  stats,
  isFavorited,
  onToggleFavorite,
  note,
  onOpenNote,
  onNext,
}: {
  mode: SessionMode;
  current: Question;
  index: number;
  queueLength: number;
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  note?: Note;
  onOpenNote: () => void;
  onNext: (selected: QuestionResponse) => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center">
      <div key={current.id} className="view-fade-in w-full">
        <QuestionCard
          headerLeft={mode !== "infinite" ? `${index + 1} / ${queueLength}` : null}
          headerAction={<HeaderActions />}
          question={current}
          onNext={onNext}
          stats={stats}
          isFavorited={isFavorited}
          onToggleFavorite={onToggleFavorite}
          note={note}
          onOpenNote={onOpenNote}
        />
      </div>
    </div>
  );
}

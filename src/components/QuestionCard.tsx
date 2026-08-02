"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import Flashcard, { FlashcardMode } from "@/components/Flashcard";
import SequenceFlashcard from "@/components/SequenceFlashcard";

export default function QuestionCard({
  question,
  mode = "immediate",
  initialResponse = [],
  stats,
  onNext,
}: {
  question: Question;
  mode?: FlashcardMode;
  initialResponse?: number[];
  stats?: QuestionStats;
  onNext?: (response: number[]) => void;
}) {
  if (question.type === "sequence") {
    return (
      <SequenceFlashcard
        question={question}
        mode={mode}
        initialOrder={initialResponse}
        stats={stats}
        onNext={onNext}
      />
    );
  }

  return (
    <Flashcard
      question={question}
      mode={mode}
      initialSelected={initialResponse}
      stats={stats}
      onNext={onNext}
    />
  );
}

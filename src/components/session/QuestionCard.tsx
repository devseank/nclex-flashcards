"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import Flashcard, { FlashcardMode } from "@/components/session/Flashcard";
import SequenceFlashcard from "@/components/session/SequenceFlashcard";
import GridFlashcard from "@/components/session/GridFlashcard";

// Thin dispatcher by question.type, not a shared visual component -- each
// question type keeps its own answer-comparison rendering (colored
// choice/step rows, not two separate "your answer" vs "correct answer"
// blocks) since showing the same rows twice with different colors was
// found to be higher cognitive load than one list, differently colored.
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

  if (question.type === "grid") {
    return (
      <GridFlashcard
        question={question}
        mode={mode}
        initialSelected={initialResponse}
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

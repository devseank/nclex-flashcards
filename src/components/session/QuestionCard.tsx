"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { QuestionResponse, BowtieResponse, HotspotResponse } from "@/lib/quizLogic";
import Flashcard, { FlashcardMode } from "@/components/session/Flashcard";
import SequenceFlashcard from "@/components/session/SequenceFlashcard";
import GridFlashcard from "@/components/session/GridFlashcard";
import ClozeFlashcard from "@/components/session/ClozeFlashcard";
import BowtieFlashcard from "@/components/session/BowtieFlashcard";
import HotspotFlashcard from "@/components/session/HotspotFlashcard";

// Thin dispatcher by question.type, not a shared visual component -- each
// question type keeps its own answer-comparison rendering (colored
// choice/step rows, not two separate "your answer" vs "correct answer"
// blocks) since showing the same rows twice with different colors was
// found to be higher cognitive load than one list, differently colored.
export default function QuestionCard({
  headerLeft,
  headerAction,
  question,
  mode = "immediate",
  initialResponse = [],
  stats,
  isFavorited,
  onToggleFavorite,
  onNext,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: Question;
  mode?: FlashcardMode;
  initialResponse?: QuestionResponse;
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onNext?: (response: QuestionResponse) => void;
}) {
  if (question.type === "sequence") {
    return (
      <SequenceFlashcard
        headerLeft={headerLeft}
        headerAction={headerAction}
        question={question}
        mode={mode}
        initialOrder={initialResponse as number[]}
        stats={stats}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onNext={onNext}
      />
    );
  }

  if (question.type === "grid") {
    return (
      <GridFlashcard
        headerLeft={headerLeft}
        headerAction={headerAction}
        question={question}
        mode={mode}
        initialSelected={initialResponse as number[][]}
        stats={stats}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onNext={onNext}
      />
    );
  }

  if (question.type === "cloze") {
    return (
      <ClozeFlashcard
        headerLeft={headerLeft}
        headerAction={headerAction}
        question={question}
        mode={mode}
        initialSelected={initialResponse as number[]}
        stats={stats}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onNext={onNext}
      />
    );
  }

  if (question.type === "bowtie") {
    return (
      <BowtieFlashcard
        headerLeft={headerLeft}
        headerAction={headerAction}
        question={question}
        mode={mode}
        // The default initialResponse=[] sentinel (no real response yet)
        // is an array -- never a valid BowtieResponse, which is always an
        // object -- so it's treated the same as "no initial response" here
        // rather than cast into a shape it can't actually be.
        initialSelected={Array.isArray(initialResponse) ? undefined : (initialResponse as BowtieResponse)}
        stats={stats}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onNext={onNext}
      />
    );
  }

  if (question.type === "hotspot") {
    return (
      <HotspotFlashcard
        headerLeft={headerLeft}
        headerAction={headerAction}
        question={question}
        mode={mode}
        // Same "[] sentinel means no real response yet" treatment as bowtie
        // above -- HotspotResponse is also always an object, never an array.
        initialSelected={Array.isArray(initialResponse) ? undefined : (initialResponse as HotspotResponse)}
        stats={stats}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        onNext={onNext}
      />
    );
  }

  return (
    <Flashcard
      headerLeft={headerLeft}
      headerAction={headerAction}
      question={question}
      mode={mode}
      initialSelected={initialResponse as number[]}
      stats={stats}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
      onNext={onNext}
    />
  );
}

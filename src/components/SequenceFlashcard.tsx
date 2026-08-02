"use client";

import { useState } from "react";
import { SequenceQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { categoryVariant } from "@/lib/categoryVariant";
import { FlashcardMode } from "@/components/Flashcard";

// Rationale for sequence questions is a numbered walkthrough ("1. ... 2. ...")
// rather than "Option A:" notes -- split it into its own paragraphs the same
// way Flashcard does for choice questions, just with a different marker.
function splitNumberedRationale(rationale: string): string[] {
  return rationale
    .split(/\s*(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SequenceFlashcard({
  question,
  onNext,
  mode = "immediate",
  initialOrder = [],
  stats,
}: {
  question: SequenceQuestion;
  onNext?: (order: number[]) => void;
  mode?: FlashcardMode;
  initialOrder?: number[];
  stats?: QuestionStats;
}) {
  const [placed, setPlaced] = useState<number[]>(initialOrder);
  const [revealed, setRevealed] = useState(mode === "review");

  const showAnswer = mode === "review" || revealed;
  const isComplete = placed.length === question.choices.length;
  const isFullyCorrect =
    showAnswer &&
    placed.length === question.correctOrder.length &&
    placed.every((choiceIndex, position) => choiceIndex === question.correctOrder[position]);

  const available = question.choices
    .map((choice, i) => ({ choice, i }))
    .filter(({ i }) => !placed.includes(i));

  function place(i: number) {
    if (showAnswer || isComplete) return;
    setPlaced((prev) => [...prev, i]);
  }

  function reset() {
    if (showAnswer) return;
    setPlaced([]);
  }

  return (
    <div className="nes-container is-rounded w-full max-w-xl bg-white space-y-5">
      <button
        type="button"
        tabIndex={-1}
        className={`nes-btn ${categoryVariant(question.category)} font-pixel text-[10px] tracking-wide !cursor-default`}
      >
        {question.category}
      </button>

      {stats && (
        <p className="text-xs text-gray-500 -mt-2">
          Attempted {stats.totalAttempts}× · {stats.correctCount} correct / {stats.incorrectCount}{" "}
          incorrect · Last: {new Date(stats.lastAttemptedAt).toLocaleDateString()}
        </p>
      )}

      <p className="text-xl leading-snug">
        {question.question}
        {!showAnswer && (
          <span className="block text-sm text-gray-500 mt-1">
            Tap the steps below in the correct order.
          </span>
        )}
      </p>

      <div className="space-y-2">
        <p className="font-pixel text-[10px] text-gray-500">YOUR ORDER</p>
        {placed.length === 0 && !showAnswer && (
          <p className="text-sm text-gray-400 italic">Tap a step below to begin.</p>
        )}
        {placed.map((choiceIndex, position) => {
          const isRightSpot = showAnswer && question.correctOrder[position] === choiceIndex;
          const variant = showAnswer ? (isRightSpot ? "is-success" : "is-error") : "";
          return (
            <div key={position} className={`nes-btn w-full text-left text-base ${variant}`}>
              {position + 1}. {question.choices[choiceIndex]}
            </div>
          );
        })}
      </div>

      {!showAnswer && available.length > 0 && (
        <div className="space-y-3">
          <p className="font-pixel text-[10px] text-gray-500">STEPS</p>
          {available.map(({ choice, i }) => (
            <button
              key={i}
              type="button"
              onClick={() => place(i)}
              className="nes-btn w-full text-left text-base"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {!showAnswer && placed.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="font-pixel text-[10px] text-[#33415c] underline"
        >
          Reset order
        </button>
      )}

      {!showAnswer && isComplete && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2"
        >
          CHECK ORDER
        </button>
      )}

      {showAnswer && (
        <div className="nes-container is-rounded space-y-2">
          <p className="font-pixel text-xs">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>
          {splitNumberedRationale(question.rationale).map((line, i) => (
            <p key={i} className="text-lg leading-snug">
              {line}
            </p>
          ))}
        </div>
      )}

      {mode !== "review" && (
        <button
          type="button"
          onClick={() => onNext?.(placed)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2"
        >
          NEXT
        </button>
      )}
    </div>
  );
}

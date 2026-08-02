"use client";

import { useState } from "react";
import { Question } from "@/services/questions";
import { categoryVariant } from "@/lib/categoryVariant";

export type FlashcardMode = "immediate" | "deferred" | "review";

export default function Flashcard({
  question,
  onNext,
  mode = "immediate",
  initialSelected = [],
}: {
  question: Question;
  onNext?: (selected: number[]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[];
}) {
  const isMultiSelect = question.correctIndices.length > 1;
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [revealed, setRevealed] = useState(mode === "review");

  const showAnswer = mode === "review" || revealed;

  const isFullyCorrect =
    showAnswer &&
    selected.length === question.correctIndices.length &&
    selected.every((i) => question.correctIndices.includes(i));

  function toggleChoice(i: number) {
    if (mode === "review" || revealed) return;

    if (mode === "deferred") {
      setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
      return;
    }

    if (isMultiSelect) {
      setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    } else {
      setSelected([i]);
      setRevealed(true);
    }
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

      <p className="text-xl leading-snug">
        {question.question}
        {mode === "deferred" && (
          <span className="block text-sm text-gray-500 mt-1">
            {isMultiSelect ? "Select all that apply." : "Select an answer."}
          </span>
        )}
        {mode === "immediate" && isMultiSelect && !revealed && (
          <span className="block text-sm text-gray-500 mt-1">Select all that apply.</span>
        )}
      </p>

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          const isCorrectChoice = question.correctIndices.includes(i);
          const isSelected = selected.includes(i);

          let variant = "";
          if (showAnswer) {
            if (isCorrectChoice) variant = "is-success";
            else if (isSelected) variant = "is-error";
            else variant = "is-disabled";
          } else if (isSelected) {
            variant = "is-primary";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={mode === "review" || revealed}
              onClick={() => toggleChoice(i)}
              className={`nes-btn w-full text-left text-base ${variant}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {mode === "immediate" && isMultiSelect && !revealed && (
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => setRevealed(true)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2 disabled:opacity-50"
        >
          CHECK ANSWER
        </button>
      )}

      {showAnswer && (
        <div className="nes-container is-rounded">
          <p className="font-pixel text-xs mb-2">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}

      {mode !== "review" && (
        <button
          type="button"
          disabled={mode === "deferred" && selected.length === 0}
          onClick={() => onNext?.(selected)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2 disabled:opacity-50"
        >
          NEXT
        </button>
      )}
    </div>
  );
}

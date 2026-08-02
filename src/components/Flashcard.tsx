"use client";

import { useState } from "react";
import { Question } from "@/services/questions";
import { categoryVariant } from "@/lib/categoryVariant";

export default function Flashcard({
  question,
  onNext,
}: {
  question: Question;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className="nes-container is-rounded w-full max-w-xl bg-white space-y-5">
      <button
        type="button"
        tabIndex={-1}
        className={`nes-btn ${categoryVariant(question.category)} font-pixel text-[10px] tracking-wide !cursor-default`}
      >
        {question.category}
      </button>

      <p className="text-xl leading-snug">{question.question}</p>

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;

          let variant = "";
          if (revealed) {
            if (isCorrect) variant = "is-success";
            else if (isSelected) variant = "is-error";
            else variant = "is-disabled";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setSelected(i)}
              className={`nes-btn w-full text-left text-base ${variant}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="nes-container is-rounded">
          <p className="font-pixel text-xs mb-2">
            {selected === question.correctIndex ? "CORRECT!" : "NOT QUITE"}
          </p>
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="nes-btn is-primary w-full font-pixel text-xs py-2"
      >
        NEXT
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Question } from "@/data/questions";

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
    <div className="pixel-panel pixel-corners-lg w-full max-w-xl p-6 space-y-5">
      <span className="pixel-tag pixel-corners-sm inline-block font-pixel-head text-[10px] tracking-wide px-3 py-2">
        {question.category}
      </span>

      <p className="text-xl leading-snug text-(--pixel-navy)">{question.question}</p>

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;

          let state = "";
          if (revealed) {
            if (isCorrect) state = "pixel-btn-correct";
            else if (isSelected) state = "pixel-btn-incorrect";
            else state = "pixel-btn-muted";
          }

          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => setSelected(i)}
              className={`pixel-btn pixel-corners-sm w-full text-left px-4 py-3 text-lg ${state}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="pixel-corners-sm border-4 border-(--pixel-navy) bg-(--pixel-cream-soft) p-4 space-y-2">
          <p className="font-pixel-head text-xs text-(--pixel-navy)">
            {selected === question.correctIndex ? "CORRECT!" : "NOT QUITE"}
          </p>
          <p className="text-lg leading-snug text-(--pixel-navy)">{question.rationale}</p>
        </div>
      )}

      <button
        onClick={onNext}
        className="pixel-cta pixel-corners-sm w-full font-pixel-head text-xs py-4"
      >
        NEXT QUESTION
      </button>
    </div>
  );
}

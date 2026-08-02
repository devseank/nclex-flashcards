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
    <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <span className="inline-block text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
        {question.category}
      </span>
      <p className="text-lg font-medium text-gray-900">{question.question}</p>

      <div className="space-y-2">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = i === selected;

          let style = "border-gray-200 text-gray-800 hover:border-indigo-300";
          if (revealed) {
            if (isCorrect) style = "border-green-500 bg-green-50 text-green-900";
            else if (isSelected) style = "border-red-500 bg-red-50 text-red-900";
            else style = "border-gray-200 text-gray-400";
          }

          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => setSelected(i)}
              className={`w-full text-left border rounded-lg px-4 py-3 transition disabled:cursor-default ${style}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-gray-700">
            {selected === question.correctIndex ? "Correct!" : "Not quite."}
          </p>
          <p className="text-sm text-gray-600">{question.rationale}</p>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full bg-indigo-600 text-white font-medium rounded-lg py-2 hover:bg-indigo-700 transition"
      >
        Next question
      </button>
    </div>
  );
}

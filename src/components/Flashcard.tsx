"use client";

import { useState } from "react";
import { ChoiceQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { categoryVariant } from "@/lib/categoryVariant";
import { cheerMessage } from "@/lib/cheerMessage";
import NewBadge from "@/components/NewBadge";
import ConfettiBurst, { ConfettiConfig, buildConfettiConfig } from "@/components/ConfettiBurst";
import StickyNextBar from "@/components/StickyNextBar";

export type FlashcardMode = "immediate" | "review";

// Rationale text has per-choice notes ("Option A: ...", "Option B: ...")
// joined inline with the main explanation. Map each one back to its choice
// index so it can render directly under that choice instead of as one
// dense wall of text below all the options.
function mapRationaleByChoice(
  rationale: string,
  correctIndices: number[],
): Record<number, string> {
  const parts = rationale
    .split(/\s*(?=Option [A-Z]:)/)
    .filter((part) => part.trim().length > 0)
    .map((part) => {
      const match = part.match(/^Option ([A-Z]):\s*([\s\S]*)$/);
      return match ? { letter: match[1], text: match[2] } : { letter: null, text: part };
    });

  const map: Record<number, string> = {};

  const mainText = parts.find((p) => p.letter === null)?.text;
  if (mainText) {
    for (const i of correctIndices) map[i] = mainText;
  }

  for (const part of parts) {
    if (!part.letter) continue;
    const index = part.letter.charCodeAt(0) - "A".charCodeAt(0);
    map[index] = part.text;
  }

  return map;
}

export default function Flashcard({
  question,
  onNext,
  mode = "immediate",
  initialSelected = [],
  stats,
}: {
  question: ChoiceQuestion;
  onNext?: (selected: number[]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[];
  stats?: QuestionStats;
}) {
  const isMultiSelect = question.correctIndices.length > 1;
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function isCorrectSelection(sel: number[]): boolean {
    return sel.length === question.correctIndices.length && sel.every((i) => question.correctIndices.includes(i));
  }

  const isFullyCorrect = showAnswer && isCorrectSelection(selected);

  const rationaleByChoice = mapRationaleByChoice(question.rationale, question.correctIndices);
  const cheer = !showAnswer ? cheerMessage(stats, question.id) : null;

  // Only the live moment of answering gets feedback -- not FinishedScreen's
  // read-only replay, which renders this same component with mode="review"
  // already revealed from the start (no actual reveal transition happens).
  const justAnswered = mode !== "review" && showAnswer;

  function reveal(sel: number[]) {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectSelection(sel)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function toggleChoice(i: number) {
    if (mode === "review" || revealed) return;

    if (isMultiSelect) {
      setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    } else {
      setSelected([i]);
      reveal([i]);
    }
  }

  return (
    <div
      className={`nes-container is-rounded w-full max-w-xl bg-white space-y-5 relative pb-24 ${
        justAnswered ? (isFullyCorrect ? "flash-correct" : "shake flash-wrong") : ""
      }`}
    >
      {!stats && <NewBadge />}
      {confettiConfig && <ConfettiBurst config={confettiConfig} />}
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

      {cheer && <p className="font-pixel text-[11px] leading-relaxed text-emerald-600 -mt-2">{cheer}</p>}

      <p className="text-xl leading-snug">
        {question.question}
        {isMultiSelect && !showAnswer && (
          <span className="block text-sm text-gray-500 mt-1">Select all that apply.</span>
        )}
      </p>

      {showAnswer && (
        <p className="font-pixel text-xs">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>
      )}

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          const isCorrectChoice = question.correctIndices.includes(i);
          const isSelected = selected.includes(i);
          const explanation = showAnswer ? rationaleByChoice[i] : undefined;

          let variant = "";
          if (showAnswer) {
            if (isCorrectChoice) variant = "is-success";
            else if (isSelected) variant = "is-error";
            else variant = "is-disabled";
          } else if (isSelected) {
            variant = "is-primary";
          }

          return (
            <div key={i}>
              <button
                type="button"
                disabled={mode === "review" || revealed}
                onClick={() => toggleChoice(i)}
                className={`nes-btn w-full text-left text-base ${variant}`}
              >
                {choice}
              </button>
              {explanation && (
                <div className="mt-1 px-3 py-2 border-l-4 border-gray-300 bg-gray-50 text-sm text-gray-700 leading-snug">
                  {explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isMultiSelect && !showAnswer && (
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => reveal(selected)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2 disabled:opacity-50"
        >
          CHECK ANSWER
        </button>
      )}

      {mode !== "review" && <StickyNextBar onClick={() => onNext?.(selected)} />}
    </div>
  );
}

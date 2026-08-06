"use client";

import { useState } from "react";
import { GridQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { categoryVariant } from "@/lib/categoryVariant";
import { cheerMessage } from "@/lib/cheerMessage";
import NewBadge from "@/components/ui/NewBadge";
import AiGeneratedBadge from "@/components/ui/AiGeneratedBadge";
import ConfettiBurst, { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import StickyNextBar from "@/components/session/StickyNextBar";
import { FlashcardMode } from "@/components/session/Flashcard";

// One radio per cell, `null` until the row has been answered -- same
// per-row-exactly-one-column shape the NGN "matrix" item type itself uses,
// so isCorrect (quizLogic.ts) can compare it directly against gridAnswer
// position-by-position rather than as a set like plain SATA does.
type RowSelection = (number | null)[];

export default function GridFlashcard({
  question,
  onNext,
  mode = "immediate",
  initialSelected = [],
  stats,
}: {
  question: GridQuestion;
  onNext?: (selected: number[]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[];
  stats?: QuestionStats;
}) {
  const [selected, setSelected] = useState<RowSelection>(
    initialSelected.length === question.choices.length ? initialSelected : question.choices.map(() => null),
  );
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function isCorrectSelection(sel: RowSelection): boolean {
    return sel.length === question.gridAnswer.length && sel.every((col, row) => col === question.gridAnswer[row]);
  }

  const allRowsAnswered = selected.every((v) => v !== null);
  const isFullyCorrect = showAnswer && isCorrectSelection(selected);
  const cheer = !showAnswer ? cheerMessage(stats, question.id) : null;

  // Only the live moment of answering gets feedback -- not FinishedScreen's
  // read-only replay, which renders this same component with mode="review"
  // already revealed from the start (no actual reveal transition happens).
  const justAnswered = mode !== "review" && showAnswer;

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectSelection(selected)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function selectCell(row: number, column: number) {
    if (showAnswer) return;
    setSelected((prev) => prev.map((v, i) => (i === row ? column : v)));
  }

  return (
    <div
      className={`nes-container is-rounded w-full max-w-xl bg-white space-y-5 relative pb-24 ${
        justAnswered ? (isFullyCorrect ? "flash-correct" : "shake flash-wrong") : ""
      }`}
    >
      {!stats && <NewBadge />}
      {question.aiGenerated && <AiGeneratedBadge />}
      {confettiConfig && <ConfettiBurst config={confettiConfig} />}
      <button
        type="button"
        tabIndex={-1}
        className={`nes-btn ${categoryVariant(question.category)} font-pixel text-[10px] tracking-wide !cursor-default`}
      >
        {question.category}
        {question.tags.length > 0 && ` — ${question.tags.join(", ")}`}
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
        {!showAnswer && <span className="block text-sm text-gray-500 mt-1">Select one option per row.</span>}
      </p>

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- static export (next/image needs no server either way, this app already sets images.unoptimized)
        <img
          src={question.imageUrl}
          alt="Question illustration"
          className="max-h-80 w-full rounded border-4 border-black object-contain"
        />
      )}

      {showAnswer && <p className="font-pixel text-xs">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>}

      <div className="space-y-4">
        {question.choices.map((label, row) => (
          <div key={row} className="space-y-2">
            <p className="text-base leading-snug">{label}</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${question.gridColumns.length}, minmax(0, 1fr))` }}>
              {question.gridColumns.map((column, colIndex) => {
                const isSelected = selected[row] === colIndex;
                const isCorrectCell = showAnswer && question.gridAnswer[row] === colIndex;
                const isWrongSelectedCell = showAnswer && isSelected && !isCorrectCell;

                let variant = "";
                if (showAnswer) {
                  if (isCorrectCell) variant = "is-success";
                  else if (isWrongSelectedCell) variant = "is-error";
                  else variant = "is-disabled";
                } else if (isSelected) {
                  variant = "is-primary";
                }

                return (
                  <button
                    key={column}
                    type="button"
                    disabled={showAnswer}
                    onClick={() => selectCell(row, colIndex)}
                    className={`nes-btn w-full text-xs py-2 ${variant}`}
                  >
                    {column}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showAnswer && question.rationale && (
        <div className="nes-container is-rounded space-y-2">
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}

      {mode !== "review" && (
        <StickyNextBar
          onClick={() => onNext?.(selected as number[])}
          disabled={!showAnswer}
          check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !allRowsAnswered } : undefined}
        />
      )}
    </div>
  );
}

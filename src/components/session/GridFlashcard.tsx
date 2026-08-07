"use client";

import { useState } from "react";
import { GridQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

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
    <FlashcardShell
      question={question}
      stats={stats}
      mode={mode}
      showAnswer={showAnswer}
      isFullyCorrect={isFullyCorrect}
      confettiConfig={confettiConfig}
      instruction={!showAnswer ? "Select one option per row." : undefined}
      onNextClick={() => onNext?.(selected as number[])}
      nextDisabled={!showAnswer}
      check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !allRowsAnswered } : undefined}
    >
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
    </FlashcardShell>
  );
}

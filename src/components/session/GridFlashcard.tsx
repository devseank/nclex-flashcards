"use client";

import { useState } from "react";
import { GridQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

// One array of selected column indices per row -- a row can have more
// than one correct column (matrix multiple-response), so this is a set per
// row, not a single value like a plain radio-per-row shape would be.
// isCorrect (quizLogic.ts) compares each row as a set against
// question.gridAnswers, not positionally.
type RowSelection = number[][];

export default function GridFlashcard({
  headerLeft,
  headerAction,
  question,
  onNext,
  mode = "immediate",
  initialSelected = [],
  stats,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: GridQuestion;
  onNext?: (selected: number[][]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[][];
  stats?: QuestionStats;
}) {
  const [selected, setSelected] = useState<RowSelection>(
    initialSelected.length === question.choices.length ? initialSelected : question.choices.map(() => []),
  );
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;
  const isMultiSelect = question.gridAnswers.some((a) => a.length > 1);

  function isCorrectSelection(sel: RowSelection): boolean {
    const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((v) => b.includes(v));
    return sel.length === question.gridAnswers.length && sel.every((cols, row) => sameSet(cols, question.gridAnswers[row]));
  }

  const allRowsAnswered = selected.every((cols) => cols.length > 0);
  const isFullyCorrect = showAnswer && isCorrectSelection(selected);

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectSelection(selected)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function toggleCell(row: number, column: number) {
    if (showAnswer) return;
    setSelected((prev) =>
      prev.map((cols, i) => (i === row ? (cols.includes(column) ? cols.filter((c) => c !== column) : [...cols, column]) : cols)),
    );
  }

  return (
    <FlashcardShell
      headerLeft={headerLeft}
      headerAction={headerAction}
      question={question}
      stats={stats}
      mode={mode}
      showAnswer={showAnswer}
      isFullyCorrect={isFullyCorrect}
      confettiConfig={confettiConfig}
      instruction={!showAnswer ? (isMultiSelect ? "Select all appropriate options for each row." : "Select one option per row.") : undefined}
      onNextClick={() => onNext?.(selected)}
      nextDisabled={!showAnswer}
      check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !allRowsAnswered } : undefined}
    >
      <div className="space-y-4">
        {question.choices.map((label, row) => (
          <div key={row} className="space-y-2">
            <p className="text-base leading-snug">{label}</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${question.gridColumns.length}, minmax(0, 1fr))` }}>
              {question.gridColumns.map((column, colIndex) => {
                const isSelected = selected[row]?.includes(colIndex) ?? false;
                const isCorrectCell = showAnswer && question.gridAnswers[row]?.includes(colIndex);
                const isWrongSelectedCell = showAnswer && isSelected && !isCorrectCell;

                let variant = "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
                let marker = null;
                if (showAnswer) {
                  if (isCorrectCell) {
                    variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
                    marker = "✓ ";
                  } else if (isWrongSelectedCell) {
                    marker = "✕ ";
                  } else {
                    variant = "border-[var(--border-muted)] text-[var(--muted-foreground)]";
                  }
                } else if (isSelected) {
                  variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
                }

                return (
                  <button
                    key={column}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={showAnswer}
                    onClick={() => toggleCell(row, colIndex)}
                    className={`border font-mono w-full text-xs py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] ${variant}`}
                  >
                    {marker}
                    {column}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showAnswer && question.rationale && (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}
    </FlashcardShell>
  );
}

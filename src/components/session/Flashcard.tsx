"use client";

import { useState } from "react";
import { ChoiceQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

// Re-exported so existing `import { FlashcardMode } from ".../Flashcard"`
// call sites (SequenceFlashcard, GridFlashcard, QuestionCard) keep working
// unchanged even though the type now lives in FlashcardShell.
export type { FlashcardMode };

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
  headerLeft,
  headerAction,
  question,
  onNext,
  mode = "immediate",
  initialSelected = [],
  stats,
  isFavorited,
  onToggleFavorite,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: ChoiceQuestion;
  onNext?: (selected: number[]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[];
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
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
    <FlashcardShell
      headerLeft={headerLeft}
      headerAction={headerAction}
      question={question}
      stats={stats}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
      mode={mode}
      showAnswer={showAnswer}
      isFullyCorrect={isFullyCorrect}
      confettiConfig={confettiConfig}
      instruction={isMultiSelect && !showAnswer ? "Select all that apply." : undefined}
      onNextClick={() => onNext?.(selected)}
      nextDisabled={isMultiSelect && !showAnswer}
      // Single-choice auto-reveals the instant a choice is picked, so NEXT
      // is never reachable pre-reveal there -- only SATA (isMultiSelect)
      // has a real gap between selecting and CHECK ANSWER, where NEXT was
      // otherwise sitting right there ready to skip the question before
      // it's actually been checked. CHECK ANSWER lives in the sticky bar
      // itself (left column, NEXT on the right) rather than as a separate
      // full-width button above it.
      check={
        isMultiSelect && !showAnswer
          ? { label: "CHECK ANSWER", onClick: () => reveal(selected), disabled: selected.length === 0 }
          : undefined
      }
    >
      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          const isCorrectChoice = question.correctIndices.includes(i);
          const isSelected = selected.includes(i);
          const explanation = showAnswer ? rationaleByChoice[i] : undefined;

          let variant = "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
          let marker = null;
          if (showAnswer) {
            if (isCorrectChoice) {
              variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
              marker = "✓ ";
            } else if (isSelected) {
              marker = "✕ ";
            } else {
              variant = "border-[var(--border-muted)] text-[var(--muted-foreground)]";
            }
          } else if (isSelected) {
            variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
          }

          return (
            <div key={i}>
              <button
                type="button"
                disabled={mode === "review" || revealed}
                onClick={() => toggleChoice(i)}
                className={`border font-mono w-full text-left text-base py-2 px-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] ${variant}`}
              >
                {marker}
                {choice}
              </button>
              {explanation && (
                <div className="mt-1 px-3 py-2 border-l-4 border-[var(--border-muted)] bg-[var(--muted)] text-sm text-[var(--muted-foreground)] leading-snug">
                  {explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FlashcardShell>
  );
}

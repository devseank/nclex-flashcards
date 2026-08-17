"use client";

import { useState } from "react";
import { ClozeQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

// One option index per blank, `null` until that blank has been answered --
// same per-blank-exactly-one-pick shape isCorrect (quizLogic.ts) compares
// positionally against clozeBlanks, same as sequence's own comparison.
type BlankSelection = (number | null)[];

// Marks {{1}}, {{2}}, ... in reading order -- clozeTemplate.split(...) with
// a capturing group keeps the markers themselves in the resulting array,
// interleaved with the plain-text segments around them.
const BLANK_MARKER = /(\{\{\d+\}\})/g;
const BLANK_MARKER_INDEX = /^\{\{(\d+)\}\}$/;

export default function ClozeFlashcard({
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
  question: ClozeQuestion;
  onNext?: (selected: number[]) => void;
  mode?: FlashcardMode;
  initialSelected?: number[];
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const [selected, setSelected] = useState<BlankSelection>(
    initialSelected.length === question.clozeBlanks.length ? initialSelected : question.clozeBlanks.map(() => null),
  );
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function isCorrectSelection(sel: BlankSelection): boolean {
    return sel.length === question.clozeBlanks.length && sel.every((v, i) => v === question.clozeBlanks[i].correctIndex);
  }

  const allBlanksAnswered = selected.every((v) => v !== null);
  const isFullyCorrect = showAnswer && isCorrectSelection(selected);

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectSelection(selected)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function pickOption(blankIndex: number, optionIndex: number) {
    if (showAnswer) return;
    setSelected((prev) => prev.map((v, i) => (i === blankIndex ? optionIndex : v)));
  }

  const segments = question.clozeTemplate.split(BLANK_MARKER);

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
      hideQuestionText
      instruction={!showAnswer ? "Choose the correct option for each blank." : undefined}
      onNextClick={() => onNext?.(selected as number[])}
      nextDisabled={!showAnswer}
      check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !allBlanksAnswered } : undefined}
    >
      <p className="text-xl leading-snug">
        {segments.map((segment, i) => {
          const match = segment.match(BLANK_MARKER_INDEX);
          if (!match) return <span key={i}>{segment}</span>;

          const blankIndex = Number(match[1]) - 1;
          const blank = question.clozeBlanks[blankIndex];
          const pick = selected[blankIndex];

          if (!showAnswer) {
            return (
              <span key={i} className="inline-block align-middle mx-1">
                <select
                  aria-label={`Blank ${blankIndex + 1}`}
                  value={pick ?? ""}
                  onChange={(e) => pickOption(blankIndex, Number(e.target.value))}
                  className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-sm px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
                  style={{ width: "auto" }}
                >
                  <option value="" disabled>
                    choose...
                  </option>
                  {blank.options.map((option, optionIndex) => (
                    <option key={optionIndex} value={optionIndex}>
                      {option}
                    </option>
                  ))}
                </select>
              </span>
            );
          }

          const pickedCorrect = pick === blank.correctIndex;
          return (
            <span key={i} className="inline-flex flex-wrap items-center gap-1 mx-1 align-middle">
              <span
                className={`border font-mono text-sm py-1 px-2 !cursor-default ${
                  pickedCorrect
                    ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]"
                    : "border-[var(--border)] text-[var(--foreground)]"
                }`}
              >
                {pickedCorrect ? "✓ " : "✕ "}
                {pick !== null ? blank.options[pick] : "(no answer)"}
              </span>
              {!pickedCorrect && (
                <span className="border border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)] font-mono text-sm py-1 px-2 !cursor-default">
                  ✓ {blank.options[blank.correctIndex]}
                </span>
              )}
            </span>
          );
        })}
      </p>

      {showAnswer && question.rationale && (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}
    </FlashcardShell>
  );
}

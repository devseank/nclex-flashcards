"use client";

import { useState } from "react";
import { BowtieQuestion } from "@/services/questions";
import { BowtieResponse } from "@/lib/quizLogic";
import { QuestionStats } from "@/services/attempts";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

type Selection = { condition: number | null; actions: number[]; monitor: number[] };

const EMPTY_SELECTION: Selection = { condition: null, actions: [], monitor: [] };

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

// One section's own choice-button list -- condition (pick exactly 1,
// single-select) and actions/monitor (pick exactly 2, capped multi-select)
// all render through this, differing only in cap and current picks.
function SectionButtons({
  choices,
  picked,
  correctAnswer,
  cap,
  showAnswer,
  onToggle,
}: {
  choices: string[];
  picked: number[];
  correctAnswer: number[];
  cap: number;
  showAnswer: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      {choices.map((choice, i) => {
        const isPicked = picked.includes(i);
        const isCorrectChoice = correctAnswer.includes(i);

        let variant = "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
        let marker = null;
        if (showAnswer) {
          if (isCorrectChoice) {
            variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
            marker = "✓ ";
          } else if (isPicked) {
            marker = "✕ ";
          } else {
            variant = "border-[var(--border-muted)] text-[var(--muted-foreground)]";
          }
        } else if (isPicked) {
          variant = "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
        }

        return (
          <button
            key={i}
            type="button"
            aria-pressed={isPicked}
            disabled={showAnswer || (!isPicked && picked.length >= cap)}
            onClick={() => onToggle(i)}
            className={`border font-mono w-full text-left text-sm py-2 px-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] ${variant}`}
          >
            {marker}
            {choice}
          </button>
        );
      })}
    </div>
  );
}

export default function BowtieFlashcard({
  headerLeft,
  headerAction,
  question,
  onNext,
  mode = "immediate",
  initialSelected,
  stats,
  isFavorited,
  onToggleFavorite,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: BowtieQuestion;
  onNext?: (selected: BowtieResponse) => void;
  mode?: FlashcardMode;
  initialSelected?: BowtieResponse;
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const [selected, setSelected] = useState<Selection>(initialSelected ?? EMPTY_SELECTION);
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function isCorrectSelection(sel: Selection): boolean {
    return (
      sel.condition === question.condition.answer &&
      sameSet(sel.actions, question.actions.answer) &&
      sameSet(sel.monitor, question.monitor.answer)
    );
  }

  const allSectionsAnswered = selected.condition !== null && selected.actions.length === 2 && selected.monitor.length === 2;
  const isFullyCorrect = showAnswer && isCorrectSelection(selected);

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectSelection(selected)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function toggleCondition(i: number) {
    if (showAnswer) return;
    setSelected((prev) => ({ ...prev, condition: i }));
  }

  function toggleActions(i: number) {
    if (showAnswer) return;
    setSelected((prev) => ({
      ...prev,
      actions: prev.actions.includes(i) ? prev.actions.filter((x) => x !== i) : [...prev.actions, i],
    }));
  }

  function toggleMonitor(i: number) {
    if (showAnswer) return;
    setSelected((prev) => ({
      ...prev,
      monitor: prev.monitor.includes(i) ? prev.monitor.filter((x) => x !== i) : [...prev.monitor, i],
    }));
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
      instruction={!showAnswer ? "Pick the most likely condition, then exactly 2 actions and 2 parameters to monitor." : undefined}
      onNextClick={() => onNext?.({ condition: selected.condition ?? -1, actions: selected.actions, monitor: selected.monitor })}
      nextDisabled={!showAnswer}
      check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !allSectionsAnswered } : undefined}
    >
      <div className="space-y-5 text-left">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">MOST LIKELY CONDITION</p>
          <SectionButtons
            choices={question.condition.choices}
            picked={selected.condition !== null ? [selected.condition] : []}
            correctAnswer={[question.condition.answer]}
            cap={1}
            showAnswer={showAnswer}
            onToggle={toggleCondition}
          />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">ACTIONS TO TAKE (pick 2)</p>
          <SectionButtons
            choices={question.actions.choices}
            picked={selected.actions}
            correctAnswer={question.actions.answer}
            cap={2}
            showAnswer={showAnswer}
            onToggle={toggleActions}
          />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">PARAMETERS TO MONITOR (pick 2)</p>
          <SectionButtons
            choices={question.monitor.choices}
            picked={selected.monitor}
            correctAnswer={question.monitor.answer}
            cap={2}
            showAnswer={showAnswer}
            onToggle={toggleMonitor}
          />
        </div>
      </div>

      {showAnswer && question.rationale && (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}
    </FlashcardShell>
  );
}

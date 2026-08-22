"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { SequenceQuestion } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { Note } from "@/services/notes";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

// Rationale for sequence questions is a numbered walkthrough ("1. ... 2. ...")
// rather than "Option A:" notes -- split it into its own paragraphs the same
// way Flashcard does for choice questions, just with a different marker.
function splitNumberedRationale(rationale: string): string[] {
  return rationale
    .split(/\s*(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// A choice's letter is fixed to its original (scrambled-storage) index, not
// its current position in the dragged order -- so a step's label never
// changes as you drag it, unlike a position-based "1. 2. 3." would.
const LETTERS = "ABCDEFGHI";

function SortableStep({
  id,
  letter,
  label,
  variant,
  marker,
  disabled,
}: {
  id: string;
  letter: string;
  label: string;
  variant: string;
  marker?: string | null;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border font-mono w-full text-left text-base py-2 px-3 flex items-center gap-3 ${variant} ${
        isDragging ? "opacity-50" : ""
      } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
      {...(disabled ? {} : { ...attributes, ...listeners })}
    >
      {!disabled && (
        <span className="text-[var(--muted-foreground)] select-none shrink-0" aria-hidden="true">
          ⠿
        </span>
      )}
      <span>
        {marker}
        {letter}. {label}
      </span>
    </div>
  );
}

// Same row markup as SortableStep (disabled), minus the drag wiring --
// so the correct-order list below looks identical to the STEPS list above,
// just recolored, instead of introducing a different visual notation.
function StaticStepRow({ letter, label, variant }: { letter: string; label: string; variant: string }) {
  return (
    <div className={`border font-mono w-full text-left text-base py-2 px-3 flex items-center gap-3 ${variant}`}>
      <span>
        ✓ {letter}. {label}
      </span>
    </div>
  );
}

export default function SequenceFlashcard({
  headerLeft,
  headerAction,
  question,
  onNext,
  mode = "immediate",
  initialOrder = [],
  stats,
  isFavorited,
  onToggleFavorite,
  note,
  hideNotePreview,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: SequenceQuestion;
  onNext?: (order: number[]) => void;
  mode?: FlashcardMode;
  initialOrder?: number[];
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  note?: Note;
  hideNotePreview?: boolean;
}) {
  const defaultOrder = question.choices.map((_, i) => i);
  const [order, setOrder] = useState<number[]>(initialOrder.length ? initialOrder : defaultOrder);
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function isCorrectOrder(o: number[]): boolean {
    return o.length === question.correctOrder.length && o.every((choiceIndex, position) => choiceIndex === question.correctOrder[position]);
  }

  const isFullyCorrect = showAnswer && isCorrectOrder(order);

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectOrder(order)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => String(i) === active.id);
      const newIndex = prev.findIndex((i) => String(i) === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function reset() {
    if (showAnswer) return;
    setOrder(defaultOrder);
  }

  return (
    <FlashcardShell
      headerLeft={headerLeft}
      headerAction={headerAction}
      question={question}
      stats={stats}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
      note={note}
      hideNotePreview={hideNotePreview}
      mode={mode}
      showAnswer={showAnswer}
      isFullyCorrect={isFullyCorrect}
      confettiConfig={confettiConfig}
      instruction={!showAnswer ? "Drag the steps below into the correct order." : undefined}
      // Sequence renders its own "CORRECT!/NOT QUITE" copy inline within its
      // rationale box below (a different spot than Flashcard/Grid put it),
      // so the shell's own copy is suppressed here.
      showCorrectIndicator={false}
      onNextClick={() => onNext?.(order)}
      nextDisabled={!showAnswer}
      // Unlike single-choice, sequence has no auto-reveal moment -- NEXT
      // would otherwise be reachable at any point while still dragging,
      // letting a question get skipped (and an attempt recorded against
      // whatever order it happened to be in) before CHECK ORDER was ever
      // pressed. CHECK ORDER lives in the sticky bar itself (left column,
      // NEXT on the right) rather than as a separate full-width button
      // above it.
      check={!showAnswer ? { label: "CHECK ORDER", onClick: reveal } : undefined}
    >
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">STEPS</p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map(String)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {order.map((choiceIndex, position) => {
                const isRightSpot = showAnswer && question.correctOrder[position] === choiceIndex;
                const variant = showAnswer
                  ? isRightSpot
                    ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]"
                    : "border-[var(--border)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
                const marker = showAnswer ? (isRightSpot ? "✓ " : "✕ ") : null;
                return (
                  <SortableStep
                    key={choiceIndex}
                    id={String(choiceIndex)}
                    letter={LETTERS[choiceIndex]}
                    label={question.choices[choiceIndex]}
                    variant={variant}
                    marker={marker}
                    disabled={showAnswer}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {!showAnswer && (
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] underline outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          Reset order
        </button>
      )}

      {showAnswer && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">CORRECT ORDER</p>
          <div className="space-y-2">
            {question.correctOrder.map((choiceIndex) => (
              <StaticStepRow
                key={choiceIndex}
                letter={LETTERS[choiceIndex]}
                label={question.choices[choiceIndex]}
                variant="border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]"
              />
            ))}
          </div>
        </div>
      )}

      {showAnswer && (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider font-bold">
            {isFullyCorrect ? "Correct!" : "Not quite"}
          </p>
          {splitNumberedRationale(question.rationale).map((line, i) => (
            <p key={i} className="text-lg leading-snug">
              {line}
            </p>
          ))}
        </div>
      )}
    </FlashcardShell>
  );
}

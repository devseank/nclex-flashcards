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
import { categoryVariant } from "@/lib/categoryVariant";
import { cheerMessage } from "@/lib/cheerMessage";
import NewBadge from "@/components/ui/NewBadge";
import AiGeneratedBadge from "@/components/ui/AiGeneratedBadge";
import ConfettiBurst, { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import StickyNextBar from "@/components/session/StickyNextBar";
import { FlashcardMode } from "@/components/session/Flashcard";

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
  disabled,
}: {
  id: string;
  letter: string;
  label: string;
  variant: string;
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
      className={`nes-btn w-full text-left text-base flex items-center gap-3 ${variant} ${
        isDragging ? "opacity-50" : ""
      } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
      {...(disabled ? {} : { ...attributes, ...listeners })}
    >
      {!disabled && (
        <span className="text-gray-400 select-none shrink-0" aria-hidden="true">
          ⠿
        </span>
      )}
      <span>
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
    <div className={`nes-btn w-full text-left text-base flex items-center gap-3 ${variant}`}>
      <span>
        {letter}. {label}
      </span>
    </div>
  );
}

export default function SequenceFlashcard({
  question,
  onNext,
  mode = "immediate",
  initialOrder = [],
  stats,
}: {
  question: SequenceQuestion;
  onNext?: (order: number[]) => void;
  mode?: FlashcardMode;
  initialOrder?: number[];
  stats?: QuestionStats;
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
  const cheer = !showAnswer ? cheerMessage(stats, question.id) : null;

  // Only the live moment of answering gets feedback -- not FinishedScreen's
  // read-only replay, which renders this same component with mode="review"
  // already revealed from the start (no actual reveal transition happens).
  const justAnswered = mode !== "review" && showAnswer;

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
        {!showAnswer && (
          <span className="block text-sm text-gray-500 mt-1">Drag the steps below into the correct order.</span>
        )}
      </p>

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- static export (next/image needs no server either way, this app already sets images.unoptimized)
        <img
          src={question.imageUrl}
          alt="Question illustration"
          className="max-h-80 w-full rounded border-4 border-black object-contain"
        />
      )}

      <div className="space-y-2">
        <p className="font-pixel text-[10px] text-gray-500">STEPS</p>
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
                const variant = showAnswer ? (isRightSpot ? "is-success" : "is-error") : "";
                return (
                  <SortableStep
                    key={choiceIndex}
                    id={String(choiceIndex)}
                    letter={LETTERS[choiceIndex]}
                    label={question.choices[choiceIndex]}
                    variant={variant}
                    disabled={showAnswer}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {!showAnswer && (
        <button type="button" onClick={reset} className="font-pixel text-[10px] text-[var(--text-navy)] underline">
          Reset order
        </button>
      )}

      {showAnswer && (
        <div className="space-y-2">
          <p className="font-pixel text-[10px] text-gray-500">CORRECT ORDER</p>
          <div className="space-y-2">
            {question.correctOrder.map((choiceIndex) => (
              <StaticStepRow
                key={choiceIndex}
                letter={LETTERS[choiceIndex]}
                label={question.choices[choiceIndex]}
                variant="is-success"
              />
            ))}
          </div>
        </div>
      )}

      {showAnswer && (
        <div className="nes-container is-rounded space-y-2">
          <p className="font-pixel text-xs">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>
          {splitNumberedRationale(question.rationale).map((line, i) => (
            <p key={i} className="text-lg leading-snug">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Unlike single-choice, sequence has no auto-reveal moment -- NEXT
          would otherwise be reachable at any point while still dragging,
          letting a question get skipped (and an attempt recorded against
          whatever order it happened to be in) before CHECK ORDER was ever
          pressed. CHECK ORDER lives in the sticky bar itself (left column,
          NEXT on the right) rather than as a separate full-width button
          above it. */}
      {mode !== "review" && (
        <StickyNextBar
          onClick={() => onNext?.(order)}
          disabled={!showAnswer}
          check={!showAnswer ? { label: "CHECK ORDER", onClick: reveal } : undefined}
        />
      )}
    </div>
  );
}

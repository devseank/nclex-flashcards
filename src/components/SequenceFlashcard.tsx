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
import NewBadge from "@/components/NewBadge";
import { FlashcardMode } from "@/components/Flashcard";

// Rationale for sequence questions is a numbered walkthrough ("1. ... 2. ...")
// rather than "Option A:" notes -- split it into its own paragraphs the same
// way Flashcard does for choice questions, just with a different marker.
function splitNumberedRationale(rationale: string): string[] {
  return rationale
    .split(/\s*(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SortableStep({
  id,
  label,
  position,
  variant,
  disabled,
}: {
  id: string;
  label: string;
  position: number;
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
        {position + 1}. {label}
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

  const showAnswer = mode === "review" || revealed;
  const isFullyCorrect =
    showAnswer &&
    order.length === question.correctOrder.length &&
    order.every((choiceIndex, position) => choiceIndex === question.correctOrder[position]);
  const cheer = !showAnswer ? cheerMessage(stats, question.id) : null;

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
    <div className="nes-container is-rounded w-full max-w-xl bg-white space-y-5 relative">
      {!stats && <NewBadge />}
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
        {!showAnswer && (
          <span className="block text-sm text-gray-500 mt-1">Drag the steps below into the correct order.</span>
        )}
      </p>

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
                    label={question.choices[choiceIndex]}
                    position={position}
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
        <button type="button" onClick={reset} className="font-pixel text-[10px] text-[#33415c] underline">
          Reset order
        </button>
      )}

      {!showAnswer && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2"
        >
          CHECK ORDER
        </button>
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

      {mode !== "review" && (
        <button
          type="button"
          onClick={() => onNext?.(order)}
          className="nes-btn is-primary w-full font-pixel text-xs py-2"
        >
          NEXT
        </button>
      )}
    </div>
  );
}

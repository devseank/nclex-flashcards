"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { categoryVariant } from "@/lib/categoryVariant";
import { cheerMessage } from "@/lib/cheerMessage";
import NewBadge from "@/components/ui/NewBadge";
import AiGeneratedBadge from "@/components/ui/AiGeneratedBadge";
import ConfettiBurst, { ConfettiConfig } from "@/components/session/ConfettiBurst";
import StickyNextBar, { StickyActionBarCheck } from "@/components/session/StickyNextBar";

// "immediate": live answering, feedback (confetti/shake, CHECK->reveal) is
// active. "review": read-only replay (FinishedScreen's list, HistoryDetail)
// -- already revealed from the start, no reveal transition ever happens.
export type FlashcardMode = "immediate" | "review";

// Shared outer chrome for all three question types (Flashcard/
// SequenceFlashcard/GridFlashcard) -- badges, category button, stats line,
// cheer message, question text + image, and the sticky NEXT bar. Each type
// keeps its own state/reveal logic and supplies only its unique answer UI
// (and rationale rendering, since those genuinely differ in shape/order per
// type) as `children`.
export default function FlashcardShell({
  headerLeft,
  headerAction,
  question,
  stats,
  mode,
  showAnswer,
  isFullyCorrect,
  confettiConfig,
  instruction,
  showCorrectIndicator = true,
  onNextClick,
  nextDisabled,
  check,
  children,
}: {
  // Attaches a navy title-bar row (same look as PixelWindow's) to the TOP of
  // this same card -- one bordered box, not a separate bar floating above it
  // -- for the live session and history-detail screens, which aren't
  // otherwise wrapped in a PixelWindow of their own. Omitted (the common
  // case: FinishedScreen's read-only review list) renders exactly as before.
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: Question;
  stats?: QuestionStats;
  mode: FlashcardMode;
  showAnswer: boolean;
  isFullyCorrect: boolean;
  confettiConfig: ConfettiConfig | null;
  // Hint line shown under the question text, pre-answer only (e.g. "Select
  // all that apply.").
  instruction?: React.ReactNode;
  // Sequence renders its own "CORRECT!/NOT QUITE" copy inline within its
  // rationale box (a different spot than Flashcard/Grid), so it opts out
  // here rather than getting a second copy from the shell.
  showCorrectIndicator?: boolean;
  onNextClick: () => void;
  nextDisabled: boolean;
  check?: StickyActionBarCheck;
  children: React.ReactNode;
}) {
  const cheer = !showAnswer ? cheerMessage(stats, question.id) : null;
  const hasHeader = !!headerAction || !!headerLeft;

  // Only the live moment of answering gets feedback -- not a read-only
  // replay (mode === "review"), which renders already revealed from the
  // start with no actual reveal transition happening.
  const justAnswered = mode !== "review" && showAnswer;

  // Without a header, the badges poke out above the card's own top corner
  // as they always have. With one, that same poke-out position would land
  // right on top of the header bar's account-menu hamburger (top-right) or
  // left-side label (top-left) -- so they move inside the body wrapper's
  // own top corner instead (see NewBadge/AiGeneratedBadge's `inset` prop).
  const badges = (
    <>
      {!stats && <NewBadge inset={hasHeader} />}
      {question.aiGenerated && <AiGeneratedBadge inset={hasHeader} />}
    </>
  );

  const body = (
    <>
      {hasHeader && badges}
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
        {!showAnswer && instruction && <span className="block text-sm text-gray-500 mt-1">{instruction}</span>}
      </p>

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- static export (next/image needs no server either way, this app already sets images.unoptimized)
        <img
          src={question.imageUrl}
          alt="Question illustration"
          className="max-h-80 w-full rounded border-4 border-black object-contain"
        />
      )}

      {showAnswer && showCorrectIndicator && (
        <p className="font-pixel text-xs">{isFullyCorrect ? "CORRECT!" : "NOT QUITE"}</p>
      )}

      {children}

      {mode !== "review" && <StickyNextBar onClick={onNextClick} disabled={nextDisabled} check={check} />}
    </>
  );

  return (
    <div
      className={`nes-container is-rounded w-full max-w-xl bg-white relative ${
        hasHeader ? "p-0" : "space-y-5 pb-24"
      } ${justAnswered ? (isFullyCorrect ? "flash-correct" : "shake flash-wrong") : ""}`}
    >
      {!hasHeader && badges}
      {confettiConfig && <ConfettiBurst config={confettiConfig} />}

      {hasHeader && (
        <div className="bg-[#12314a] flex items-center justify-between px-3 py-2">
          <span className="font-pixel text-[10px] text-white">{headerLeft}</span>
          {headerAction}
        </div>
      )}

      {hasHeader ? <div className="relative p-6 space-y-5 pb-24">{body}</div> : body}
    </div>
  );
}

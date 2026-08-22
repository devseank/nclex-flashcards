"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { Note } from "@/services/notes";
import { cheerMessage } from "@/lib/cheerMessage";
import NewBadge from "@/components/ui/NewBadge";
import AiGeneratedBadge from "@/components/ui/AiGeneratedBadge";
import FavoriteButton from "@/components/ui/FavoriteButton";
import ConfettiBurst, { ConfettiConfig } from "@/components/session/ConfettiBurst";
import StickyNextBar, { StickyActionBarCheck } from "@/components/session/StickyNextBar";
import NotePreview from "@/components/session/NotePreview";

// "immediate": live answering, feedback (confetti/shake, CHECK->reveal) is
// active. "review": read-only replay (FinishedScreen's list, HistoryDetail)
// -- already revealed from the start, no reveal transition ever happens.
export type FlashcardMode = "immediate" | "review";

// Shared outer chrome for all six question types -- badges, category label,
// stats line, cheer message, question text + image, and the sticky NEXT
// bar. Each type keeps its own state/reveal logic and supplies only its
// unique answer UI (and rationale rendering, since those genuinely differ
// in shape/order per type) as `children`.
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
  hideQuestionText = false,
  isFavorited,
  onToggleFavorite,
  note,
  onOpenNote,
  onNextClick,
  nextDisabled,
  check,
  children,
}: {
  // Attaches a title-bar row (same look as PixelWindow's) to the TOP of
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
  // Cloze renders its own interactive sentence (with embedded dropdowns
  // replacing each blank) as its first child instead -- `question.question`
  // there is just the plain, derived, underscore-blanked text used for the
  // DB's unique dedup key, not something worth showing verbatim as well.
  hideQuestionText?: boolean;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  // Undefined note + undefined onOpenNote (NotePreview's own no-op-if-
  // missing-onOpen guard) is what every caller not yet wired for notes
  // renders as -- nothing extra, not an error.
  note?: Note;
  onOpenNote?: () => void;
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
      <div className="flex items-center justify-between gap-2">
        <span className="inline-block border border-[var(--border)] font-mono text-[10px] uppercase tracking-wider px-2 py-1">
          {question.category}
          {question.tags.length > 0 && ` — ${question.tags.join(", ")}`}
        </span>
        <FavoriteButton isFavorited={isFavorited} onToggle={onToggleFavorite} />
      </div>

      {stats && (
        <p className="text-xs text-[var(--muted-foreground)] -mt-2">
          Attempted {stats.totalAttempts}× · {stats.correctCount} correct / {stats.incorrectCount}{" "}
          incorrect · Last: {new Date(stats.lastAttemptedAt).toLocaleDateString()}
        </p>
      )}

      {cheer && <p className="font-mono text-[11px] leading-relaxed italic text-[var(--muted-foreground)] -mt-2">{cheer}</p>}

      {!hideQuestionText && (
        <p className="text-xl leading-snug">
          {question.question}
          {!showAnswer && instruction && (
            <span className="block text-sm text-[var(--muted-foreground)] mt-1">{instruction}</span>
          )}
        </p>
      )}
      {hideQuestionText && !showAnswer && instruction && (
        <p className="text-sm text-[var(--muted-foreground)]">{instruction}</p>
      )}

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- static export (next/image needs no server either way, this app already sets images.unoptimized)
        <img
          src={question.imageUrl}
          alt="Question illustration"
          className="max-h-80 w-full border border-[var(--border)] object-contain"
        />
      )}

      {showAnswer && showCorrectIndicator && (
        <p className="font-mono text-xs uppercase tracking-wider font-bold">
          {isFullyCorrect ? "Correct!" : "Not quite"}
        </p>
      )}

      {children}

      {showAnswer && <NotePreview note={note} onOpen={onOpenNote} />}

      {mode !== "review" && <StickyNextBar onClick={onNextClick} disabled={nextDisabled} check={check} />}
    </>
  );

  return (
    <div
      className={`border border-[var(--border)] bg-[var(--surface)] text-[var(--surface-foreground)] w-full max-w-xl relative ${
        hasHeader ? "p-0" : "space-y-5 pb-24"
      } ${justAnswered ? (isFullyCorrect ? "flash-correct" : "shake flash-wrong") : ""}`}
    >
      {!hasHeader && badges}
      {confettiConfig && <ConfettiBurst config={confettiConfig} />}

      {hasHeader && (
        <div className="border-b border-[var(--border)] flex items-center justify-between px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-wider">{headerLeft}</span>
          {headerAction}
        </div>
      )}

      {hasHeader ? <div className="relative p-6 space-y-5 pb-24">{body}</div> : body}
    </div>
  );
}

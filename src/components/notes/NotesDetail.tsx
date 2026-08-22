"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";
import QuestionCard from "@/components/session/QuestionCard";
import TagCombobox from "@/components/notes/TagCombobox";
import { Question, fetchQuestionsByIds } from "@/services/questions";
import { fetchAttempts, Attempt } from "@/services/attempts";
import { selectMostRelevantAttempt } from "@/lib/quizLogic";
import {
  Note,
  NoteInput,
  fetchNoteForQuestion,
  createBlankNote,
  saveNote,
  fetchNextNote,
  fetchNoteTagVocabulary,
} from "@/services/notes";
import { getErrorMessage } from "@/lib/errorMessage";

const EMPTY_INPUT: NoteInput = { text: "", tag: null };

function padInputs(inputs: NoteInput[]): NoteInput[] {
  const padded = [...inputs, EMPTY_INPUT, EMPTY_INPUT, EMPTY_INPUT];
  return padded.slice(0, 3);
}

export default function NotesDetail({
  questionId,
  favoriteIds,
  onToggleFavorite,
  onNext,
}: {
  questionId: number;
  favoriteIds: Set<number>;
  onToggleFavorite: (questionId: number) => void;
  onNext: (questionId: number) => void;
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  // The single most useful past attempt (latest wrong, else latest, else
  // null for "never attempted") -- see selectMostRelevantAttempt.
  const [relevantAttempt, setRelevantAttempt] = useState<Attempt | null>(null);
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftInputs, setDraftInputs] = useState<NoteInput[]>(padInputs([]));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The one flush function every persistence point calls -- debounce
  // timeout, explicit SAVE, and (via flushRef below) navigating away
  // mid-edit. Returns the saved-or-deleted result so NEXT can use its
  // fresh updatedAt/id as the cursor even if the debounce hadn't fired yet.
  //
  // `isFinal` distinguishes "the idle timer ticked while the user is still
  // sitting on this note" from "this is genuinely the last write" (explicit
  // SAVE, NEXT, or navigating away). Without this, a brand-new "+ NOTE"
  // that's never been typed into gets deleted by its own first debounce
  // tick -- `note.inputs` (just-created, blank) and the filtered draft
  // (still blank) are identical, so nothing has actually changed, but the
  // delete-on-blank rule would fire anyway 1.5s after opening it, before
  // the user has had a chance to type a single character. Skip entirely
  // when nothing has changed AND (it already has content, so there's
  // nothing to clean up, OR this isn't the final flush yet) -- only a
  // genuine content change, or the final flush, is allowed to delete an
  // untouched blank note.
  const flush = useCallback(
    (isFinal = false): Promise<Note | null> => {
      if (!note) return Promise.resolve(null);
      const filled = draftInputs.filter((i) => i.text.trim().length > 0);
      const unchanged = JSON.stringify(filled) === JSON.stringify(note.inputs);
      if (unchanged && (filled.length > 0 || !isFinal)) return Promise.resolve(note);
      return saveNote(note.id, filled)
        .then((saved) => {
          setNote(saved);
          return saved;
        })
        .catch((err) => {
          console.error("Failed to save note:", err);
          return note;
        });
    },
    [note, draftInputs],
  );

  // Always-latest-closure ref, for the data-load effect's cleanup below --
  // that cleanup only needs to fire once per questionId change (or unmount),
  // but must flush whatever the CURRENT draftInputs/note are at that moment,
  // not whatever they were when the effect first ran.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Debounced autosave -- one whole-note timer (not one per input), reset
  // on every draftInputs change while editing, per the settled 1.5s delay.
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      flush();
    }, 1500);
    return () => clearTimeout(timer);
  }, [flush, isEditing]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setNotice(null);
      setNote(null);
      setQuestion(null);
      setRelevantAttempt(null);
      setIsEditing(false);

      try {
        let n = await fetchNoteForQuestion(questionId);
        if (!n) n = await createBlankNote(questionId);
        if (cancelled) return;
        setNote(n);
        setDraftInputs(padInputs(n.inputs));
        // All-blank means either brand new (just created above) or -- in
        // principle -- an existing row that somehow never got cleaned up;
        // either way there's nothing to lose by opening straight into edit
        // mode, which is exactly what "+ NOTE" wants.
        setIsEditing(n.inputs.every((i) => i.text.trim().length === 0));

        const [hydratedQuestions, attempts, tagVocabulary] = await Promise.all([
          fetchQuestionsByIds([questionId]),
          fetchAttempts(),
          fetchNoteTagVocabulary(),
        ]);
        if (cancelled) return;
        setQuestion(hydratedQuestions[0] ?? null);
        setVocabulary(tagVocabulary);
        setRelevantAttempt(selectMostRelevantAttempt(attempts, questionId));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }
    load();

    return () => {
      cancelled = true;
      // Covers both "navigated to a different note via NEXT" (questionId
      // changes, component doesn't unmount) and "navigated away entirely"
      // (Home, browser back) -- one cleanup, no separate unmount-only effect.
      // Final flush: an untouched blank note gets cleaned up here even
      // though the periodic debounce tick above declines to.
      flushRef.current(true);
    };
  }, [questionId]);

  function updateDraftInput(index: number, patch: Partial<NoteInput>) {
    setDraftInputs((prev) => prev.map((input, i) => (i === index ? { ...input, ...patch } : input)));
  }

  function handleEdit() {
    if (!note) return;
    setDraftInputs(padInputs(note.inputs));
    setIsEditing(true);
  }

  function handleSave() {
    flush(true);
    setIsEditing(false);
  }

  async function handleNext() {
    setNotice(null);
    const flushed = isEditing ? await flush(true) : note;
    setIsEditing(false);
    const cursor = flushed ?? note;
    if (!cursor) return;
    try {
      const next = await fetchNextNote({ updatedAt: cursor.updatedAt, id: cursor.id });
      if (next) onNext(next.questionId);
      else setNotice("You've reached the last note.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (error) {
    return (
      <PixelWindow title="NOTE.EXE" headerAction={<HeaderActions />} wide>
        <p className="font-mono text-sm text-[var(--foreground)]">{error}</p>
      </PixelWindow>
    );
  }

  if (!note) {
    return (
      <PixelWindow title="NOTE.EXE" headerAction={<HeaderActions />} wide>
        <p className="font-mono text-sm text-[var(--muted-foreground)]">Loading note…</p>
      </PixelWindow>
    );
  }

  const displayedInputs = isEditing ? draftInputs : note.inputs.filter((i) => i.text.trim().length > 0);

  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      <PixelWindow title="NOTE.EXE" headerAction={<HeaderActions />} wide>
        <div className="space-y-4 text-left">
          {displayedInputs.length === 0 && !isEditing && (
            <p className="font-mono text-sm text-[var(--muted-foreground)] text-center py-2">This note is empty.</p>
          )}

          {isEditing
            ? draftInputs.map((input, i) => (
                <div key={i} className="space-y-1.5">
                  <TagCombobox
                    value={input.tag ?? ""}
                    onChange={(tag) => updateDraftInput(i, { tag: tag.trim() ? tag : null })}
                    vocabulary={vocabulary}
                  />
                  <textarea
                    value={input.text}
                    onChange={(e) => updateDraftInput(i, { text: e.target.value })}
                    rows={3}
                    placeholder={`Note ${i + 1} (optional)`}
                    className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-sm px-2 py-1.5 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] resize-y"
                  />
                </div>
              ))
            : displayedInputs.map((input, i) => (
                <div key={i} className="flex items-start gap-2">
                  {input.tag && (
                    <span className="shrink-0 border border-[var(--border)] font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5">
                      {input.tag}
                    </span>
                  )}
                  <p className="text-sm leading-snug whitespace-pre-wrap">{input.text}</p>
                </div>
              ))}

          <button
            type="button"
            onClick={isEditing ? handleSave : handleEdit}
            className="cursor-pointer w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>
      </PixelWindow>

      {question && (
        <QuestionCard
          headerLeft={relevantAttempt ? (relevantAttempt.isCorrect ? "LAST ATTEMPT — CORRECT" : "LAST ATTEMPT — INCORRECT") : "QUESTION"}
          headerAction={<HeaderActions />}
          question={question}
          mode="review"
          initialResponse={
            relevantAttempt
              ? relevantAttempt.gridSelections ??
                relevantAttempt.bowtieResponse ??
                relevantAttempt.hotspotResponse ??
                relevantAttempt.selectedIndices
              : undefined
          }
          isFavorited={favoriteIds.has(question.id)}
          onToggleFavorite={() => onToggleFavorite(question.id)}
        />
      )}

      {notice && <p className="font-mono text-xs text-[var(--muted-foreground)] text-center">{notice}</p>}

      <button
        type="button"
        onClick={handleNext}
        className="cursor-pointer w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-sm uppercase tracking-wider py-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
      >
        Next
      </button>
    </div>
  );
}

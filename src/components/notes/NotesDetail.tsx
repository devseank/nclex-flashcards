"use client";

import { useEffect, useState } from "react";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";
import QuestionCard from "@/components/session/QuestionCard";
import TagCombobox from "@/components/notes/TagCombobox";
import { Question, fetchQuestionsByIds } from "@/services/questions";
import { fetchAttempts, Attempt } from "@/services/attempts";
import { selectMostRelevantAttempt } from "@/lib/quizLogic";
import { fetchNoteForQuestion, fetchNextNote } from "@/services/notes";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { getErrorMessage } from "@/lib/errorMessage";

// The dedicated "browse everything you've annotated" page -- creating and
// day-to-day editing now happens inline under a revealed answer instead
// (see NotePreview.tsx); this is for reviewing systematically, cycling
// through via NEXT, with the associated question/attempt for context.
// Editing itself delegates to the same useNoteEditor hook NotePreview uses.
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
  const [question, setQuestion] = useState<Question | null>(null);
  // The single most useful past attempt (latest wrong, else latest, else
  // null for "never attempted") -- see selectMostRelevantAttempt.
  const [relevantAttempt, setRelevantAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const editor = useNoteEditor(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setNotice(null);
      setQuestion(null);
      setRelevantAttempt(null);
      setLoading(true);
      editor.setNote(null);
      editor.setIsEditing(false);

      try {
        const existing = await fetchNoteForQuestion(questionId);
        if (cancelled) return;
        if (existing) {
          editor.setNote(existing);
        } else {
          // No note yet -- same "start editing" entry point NotePreview's
          // "+ NOTE" uses, which creates a blank row and flips into edit
          // mode in one step.
          await editor.edit(questionId);
          if (cancelled) return;
        }

        const [hydratedQuestions, attempts] = await Promise.all([
          fetchQuestionsByIds([questionId]),
          fetchAttempts(),
        ]);
        if (cancelled) return;
        setQuestion(hydratedQuestions[0] ?? null);
        setRelevantAttempt(selectMostRelevantAttempt(attempts, questionId));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  async function handleNext() {
    setNotice(null);
    const flushed = editor.isEditing ? await editor.save().then(() => editor.note) : editor.note;
    const cursor = flushed ?? editor.note;
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

  if (loading || !editor.note) {
    return (
      <PixelWindow title="NOTE.EXE" headerAction={<HeaderActions />} wide>
        <p className="font-mono text-sm text-[var(--muted-foreground)]">Loading note…</p>
      </PixelWindow>
    );
  }

  const displayedInputs = editor.isEditing ? editor.draftInputs : editor.note.inputs.filter((i) => i.text.trim().length > 0);

  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      <PixelWindow title="NOTE.EXE" headerAction={<HeaderActions />} wide>
        <div className="space-y-4 text-left">
          {displayedInputs.length === 0 && !editor.isEditing && (
            <p className="font-mono text-sm text-[var(--muted-foreground)] text-center py-2">This note is empty.</p>
          )}

          {editor.isEditing
            ? editor.draftInputs.map((input, i) => (
                <div key={i} className="space-y-1.5">
                  <TagCombobox
                    value={input.tag ?? ""}
                    onChange={(tag) => editor.updateDraftInput(i, { tag: tag.trim() ? tag : null })}
                    vocabulary={editor.vocabulary}
                  />
                  <textarea
                    value={input.text}
                    onChange={(e) => editor.updateDraftInput(i, { text: e.target.value })}
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
            onClick={() => (editor.isEditing ? editor.save() : editor.edit(questionId))}
            className="cursor-pointer w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            {editor.isEditing ? "Save" : "Edit"}
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
          hideNotePreview
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

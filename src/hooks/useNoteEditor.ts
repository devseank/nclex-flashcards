"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Note, NoteInput } from "@/services/notes";
import { useNoteApi } from "@/lib/noteApiContext";

const EMPTY_INPUT: NoteInput = { text: "", tag: null };

export function padNoteInputs(inputs: NoteInput[]): NoteInput[] {
  return [...inputs, EMPTY_INPUT, EMPTY_INPUT, EMPTY_INPUT].slice(0, 3);
}

// Owns one question's Note through its full edit lifecycle -- creating it
// on first edit, debounced autosave while editing, and the delete-if-blank
// rule on every flush. Shared by the inline editor under a revealed answer
// (NotePreview) and the dedicated NOTES.EXE detail page (NotesDetail), so
// this logic -- and its two hard-won bug fixes, both explained below --
// exists exactly once.
export function useNoteEditor(initialNote: Note | null) {
  const api = useNoteApi();
  const [note, setNote] = useState<Note | null>(initialNote);
  const [isEditing, setIsEditing] = useState(false);
  const [draftInputs, setDraftInputs] = useState<NoteInput[]>(padNoteInputs(initialNote?.inputs ?? []));
  // `null` means "not fetched yet" -- fetched lazily, once, the first time
  // editing actually starts (see ensureVocabulary), not on mount, since most
  // revealed answers are never edited.
  const [vocabulary, setVocabulary] = useState<string[] | null>(null);

  // The one flush function every persistence point calls -- debounce
  // timeout, explicit SAVE, and (via flushRef below) navigating away
  // mid-edit. Returns the saved-or-deleted result so callers (NotesDetail's
  // NEXT) can use its fresh updatedAt/id immediately.
  //
  // `isFinal` distinguishes "the idle timer ticked while the user is still
  // sitting on this note" from "this is genuinely the last write" (explicit
  // SAVE, NEXT, or navigating/unmounting). Without this, a brand-new note
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
      return api
        .saveNote(note.questionId, note.id, filled)
        .then((saved) => {
          setNote(saved);
          return saved;
        })
        .catch((err) => {
          console.error("Failed to save note:", err);
          return note;
        });
    },
    [note, draftInputs, api],
  );

  // Always-latest-closure ref, for the unmount effect below -- that effect
  // only needs to fire once, but must flush whatever the CURRENT
  // draftInputs/note are at that moment, not whatever they were when it
  // first ran (an empty dependency array means its own closure is frozen
  // at mount time otherwise).
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Debounced autosave -- one whole-note timer (not one per input), reset
  // on every draftInputs change while editing.
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      flush();
    }, 1500);
    return () => clearTimeout(timer);
  }, [flush, isEditing]);

  // Flush on unmount -- covers navigating away (Home, back, answering
  // NEXT) while still mid-edit. `isFinal: true` here is what lets an
  // abandoned, never-touched blank note actually get cleaned up, since the
  // periodic tick above deliberately declines to.
  useEffect(() => {
    return () => {
      flushRef.current(true);
    };
  }, []);

  function updateDraftInput(index: number, patch: Partial<NoteInput>) {
    setDraftInputs((prev) => prev.map((input, i) => (i === index ? { ...input, ...patch } : input)));
  }

  function ensureVocabulary() {
    if (vocabulary !== null) return;
    api
      .fetchNoteTagVocabulary()
      .then(setVocabulary)
      .catch((err) => {
        console.error("Failed to load note tags:", err);
        setVocabulary([]);
      });
  }

  // The one entry point for "start editing this question's note" -- covers
  // both an existing note (just flips into edit mode) and a question with
  // none yet (creates a blank row first). Callers don't need to know which
  // case they're in.
  async function edit(questionId: number) {
    let n = note;
    if (!n) n = await api.createBlankNote(questionId);
    setNote(n);
    setDraftInputs(padNoteInputs(n.inputs));
    setIsEditing(true);
    ensureVocabulary();
  }

  // The one entry point for "display this note (or the absence of one),
  // not currently editing it" -- callers that just fetched/adopted a Note
  // to show read-only (NotesDetail's initial load, NotePreview's late
  // batched-read adopt) MUST go through this rather than a bare `note`
  // setter. `flush` always diffs `draftInputs` against `note.inputs` to
  // decide whether anything actually changed (and deletes the note if the
  // result is blank) -- if a caller updates `note` without also updating
  // `draftInputs` to match, draftInputs is left at its stale/blank initial
  // value, so leaving the page (unmount => flush(true)) sees "everything
  // was cleared" and deletes a note the user never touched. This was a
  // real bug: viewing an existing note on NotesDetail without ever
  // pressing Edit, then navigating away, silently deleted it.
  function loadNote(n: Note | null) {
    setNote(n);
    setDraftInputs(padNoteInputs(n?.inputs ?? []));
    setIsEditing(false);
  }

  async function save() {
    await flush(true);
    setIsEditing(false);
  }

  return {
    note,
    loadNote,
    isEditing,
    setIsEditing,
    draftInputs,
    vocabulary: vocabulary ?? [],
    updateDraftInput,
    edit,
    save,
  };
}

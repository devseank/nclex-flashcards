"use client";

import { useEffect } from "react";
import { Pencil, StickyNote } from "lucide-react";
import { Note } from "@/services/notes";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useNoteApi } from "@/lib/noteApiContext";
import TagCombobox from "@/components/notes/TagCombobox";
import TagBadge from "@/components/notes/TagBadge";

// Note editing lives right here, under the revealed answer -- no navigating
// to a dedicated page to jot something down while the question's still on
// screen. `note` is the batched read from useQuizSession's notesByQuestionId
// cache (fast path: most revealed answers are never edited, so this avoids
// an extra fetch per question); `questionId` is what `edit()` needs to
// create a blank row the first time, for a question with no note yet.
export default function NotePreview({
  questionId,
  note,
}: {
  questionId: number;
  note?: Note;
}) {
  const editor = useNoteEditor(note ?? null);
  const { tagColors } = useNoteApi();

  // Adopts the batched note once it resolves, if it arrives after this
  // component already mounted (hydrateNotes is async) -- but never while
  // actively editing, so a slow, now-stale batched read can't clobber
  // in-progress typing or a freshly-created draft.
  useEffect(() => {
    if (!editor.isEditing && note && !editor.note) {
      editor.loadNote(note);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  if (editor.isEditing) {
    return (
      <div className="border border-[var(--border-muted)] bg-[var(--muted)] p-3 space-y-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Your note</p>
        {editor.draftInputs.map((input, i) => (
          <div key={i} className="flex items-start gap-2">
            <TagCombobox
              value={input.tag ?? ""}
              onChange={(tag) => editor.updateDraftInput(i, { tag: tag.trim() ? tag : null })}
              vocabulary={editor.vocabulary}
              colors={tagColors}
            />
            <textarea
              value={input.text}
              onChange={(e) => editor.updateDraftInput(i, { text: e.target.value })}
              rows={2}
              placeholder={`Note ${i + 1} (optional)`}
              className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-sm px-2 py-1.5 flex-1 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] resize-y"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => editor.save()}
          className="cursor-pointer w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          Save
        </button>
      </div>
    );
  }

  const filledInputs = editor.note?.inputs.filter((i) => i.text.trim().length > 0) ?? [];

  if (filledInputs.length === 0) {
    return (
      <button
        type="button"
        onClick={() => editor.edit(questionId)}
        className="cursor-pointer inline-flex items-center gap-1.5 self-start border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
      >
        <StickyNote size={12} /> + New Note
      </button>
    );
  }

  return (
    <div className="border border-[var(--border-muted)] bg-[var(--muted)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Your note</p>
        <button
          type="button"
          onClick={() => editor.edit(questionId)}
          aria-label="Edit note"
          title="Edit note"
          className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] leading-none p-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          <Pencil size={12} />
        </button>
      </div>
      {filledInputs.map((input, i) => (
        <div key={i} className="flex items-start gap-2">
          {input.tag && <TagBadge tag={input.tag} colors={tagColors} />}
          <p className="text-sm leading-snug whitespace-pre-wrap">{input.text}</p>
        </div>
      ))}
    </div>
  );
}

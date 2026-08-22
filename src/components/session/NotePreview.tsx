"use client";

import { Pencil, StickyNote } from "lucide-react";
import { Note } from "@/services/notes";

// Read-only preview of a question's Note, shown under a revealed answer
// (SessionScreen/HistoryDetail/FavoritesDetail/FinishedScreen) -- editing
// only ever happens on the dedicated NOTES.EXE detail page, this is just
// "does one exist, and what's in it" at a glance, plus the one entry point
// (new or existing) into that page. Renders nothing if `onOpen` isn't
// wired up by the caller.
export default function NotePreview({
  note,
  onOpen,
}: {
  note?: Note;
  onOpen?: () => void;
}) {
  if (!onOpen) return null;

  const filledInputs = note?.inputs.filter((i) => i.text.trim().length > 0) ?? [];

  if (filledInputs.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="cursor-pointer inline-flex items-center gap-1.5 self-start border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
      >
        <StickyNote size={12} /> Note
      </button>
    );
  }

  return (
    <div className="border border-[var(--border-muted)] bg-[var(--muted)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Your note</p>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Edit note"
          title="Edit note"
          className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] leading-none p-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          <Pencil size={12} />
        </button>
      </div>
      {filledInputs.map((input, i) => (
        <div key={i} className="flex items-start gap-2">
          {input.tag && (
            <span className="shrink-0 border border-[var(--border)] font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5">
              {input.tag}
            </span>
          )}
          <p className="text-sm leading-snug whitespace-pre-wrap">{input.text}</p>
        </div>
      ))}
    </div>
  );
}

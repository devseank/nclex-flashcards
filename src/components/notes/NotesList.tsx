"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";
import TagBadge from "@/components/notes/TagBadge";
import TagColorEditor from "@/components/notes/TagColorEditor";
import { useNoteApi } from "@/lib/noteApiContext";
import { fetchNotesPage, NoteListEntry } from "@/services/notes";
import { getErrorMessage } from "@/lib/errorMessage";

const PAGE_SIZE = 50;

// First real page-by-page pagination in this app (every other list either
// drains everything via fetchAllRows or does a top-N slice like HISTORY's
// limit picker) -- kept to plain PREV/NEXT + a page count, no jump-to-page,
// consistent with no filter/search in v1.
export default function NotesList({ onSelect }: { onSelect: (questionId: number) => void }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [data, setData] = useState<{ notes: NoteListEntry[]; totalCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTagColors, setShowTagColors] = useState(false);
  const { tagColors } = useNoteApi();

  useEffect(() => {
    fetchNotesPage(pageIndex, PAGE_SIZE)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, [pageIndex]);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <PixelWindow title="NOTES.EXE" headerAction={<HeaderActions />} wide>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowTagColors((prev) => !prev)}
          className="cursor-pointer inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          <Palette size={12} /> {showTagColors ? "Hide tag colors" : "Tag colors"}
        </button>

        {showTagColors && <TagColorEditor />}

        {error && <p className="font-mono text-sm text-[var(--foreground)] text-center py-4">{error}</p>}

        {!error && data && data.notes.length === 0 && (
          <p className="font-mono text-sm text-[var(--muted-foreground)] text-center py-4">
            No notes yet — tap “+ NOTE” under a revealed answer to add one.
          </p>
        )}

        {!error && data && data.notes.length > 0 && (
          <>
            <div className="space-y-2">
              {data.notes.map((note) => {
                const tags = note.inputs.flatMap((i) => (i.tag ? [i.tag] : []));
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onSelect(note.questionId)}
                    className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono w-full text-left py-2 px-3 flex items-center gap-2 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
                  >
                    <span className="shrink-0 text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      {note.category}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{note.questionText}</span>
                    {tags.length > 0 && (
                      <span className="shrink-0 flex gap-1">
                        {tags.map((tag, i) => (
                          <TagBadge key={i} tag={tag} colors={tagColors} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
                Page {pageIndex + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((p) => p + 1)}
                disabled={pageIndex + 1 >= totalPages}
                className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </PixelWindow>
  );
}

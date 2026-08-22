"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useNoteApi } from "@/lib/noteApiContext";
import { TAG_COLOR_PALETTE, getTagColor, readableTextColor } from "@/lib/tagColors";
import TagBadge from "@/components/notes/TagBadge";
import { getErrorMessage } from "@/lib/errorMessage";

// NOTES.EXE's tag color customization panel -- one row per tag that's ever
// been used, a palette swatch strip to reassign it. Reuses the same
// vocabulary fetch TagCombobox's autocomplete draws from (the notes table
// has no separate tags table -- see docs/adr/0001), so a tag shows up here
// the moment it's used anywhere, no separate "register a tag" step.
export default function TagColorEditor() {
  const { tagColors, setTagColor, fetchNoteTagVocabulary } = useNoteApi();
  const [vocabulary, setVocabulary] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNoteTagVocabulary()
      .then(setVocabulary)
      .catch((err) => setError(getErrorMessage(err)));
  }, [fetchNoteTagVocabulary]);

  return (
    <div className="border border-[var(--border-muted)] bg-[var(--muted)] p-3 space-y-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Tag colors</p>

      {error && <p className="font-mono text-xs text-[var(--foreground)]">{error}</p>}

      {!error && vocabulary && vocabulary.length === 0 && (
        <p className="font-mono text-xs text-[var(--muted-foreground)]">No tags yet — add one to a note first.</p>
      )}

      {!error && vocabulary && vocabulary.length > 0 && (
        <div className="space-y-2.5">
          {vocabulary.map((tag) => {
            const current = getTagColor(tagColors, tag);
            return (
              <div key={tag} className="flex items-center gap-2 flex-wrap">
                <TagBadge tag={tag} colors={tagColors} />
                <div className="flex items-center gap-1">
                  {TAG_COLOR_PALETTE.map((swatch) => {
                    const selected = swatch.toLowerCase() === current.toLowerCase();
                    return (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`Set ${tag} color to ${swatch}`}
                        onClick={() => setTagColor(tag, swatch)}
                        style={{ backgroundColor: swatch }}
                        className="cursor-pointer size-5 flex items-center justify-center border border-[var(--border)] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
                      >
                        {selected && <Check size={12} color={readableTextColor(swatch)} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

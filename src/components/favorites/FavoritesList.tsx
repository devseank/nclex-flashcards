"use client";

import { Question } from "@/services/questions";
import PixelWindow from "@/components/ui/PixelWindow";
import HeaderActions from "@/components/ui/HeaderActions";
import { Star } from "lucide-react";

export default function FavoritesList({
  questions,
  favoriteIds,
  onRemove,
  onSelect,
  onPlay,
}: {
  questions: Question[];
  favoriteIds: Set<number>;
  onRemove: (questionId: number) => void;
  onSelect: (question: Question) => void;
  onPlay: () => void;
}) {
  const favorites = questions.filter((q) => favoriteIds.has(q.id));

  return (
    <PixelWindow title="FAVORITES.EXE" headerAction={<HeaderActions />} wide>
      <div className="space-y-3">
        {favorites.length === 0 && (
          <p className="font-mono text-sm text-[var(--muted-foreground)] text-center py-4">
            No favorites yet — tap the star on any question to add one.
          </p>
        )}

        {favorites.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
                {favorites.length} question{favorites.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={onPlay}
                className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs uppercase tracking-wider px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
              >
                PLAY
              </button>
            </div>

            <div className="space-y-2">
              {favorites.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelect(q)}
                  className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono w-full text-left py-2 px-3 flex items-center gap-2 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onRemove(q.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onRemove(q.id); } }}
                    aria-label="Remove from favorites"
                    title="Remove from favorites"
                    className="cursor-pointer shrink-0 text-[var(--signal)] leading-none p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
                  >
                    <Star size={14} fill="currentColor" />
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    {q.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{q.question}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </PixelWindow>
  );
}

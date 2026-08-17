"use client";

import { useState } from "react";
import { Question } from "@/services/questions";
import { getAllCategories, getAllTags, getTagsForCategories, getAllSources } from "@/lib/tags";
import { QuestionKind, KIND_LABELS } from "@/lib/questionKind";
import { QuestionFilter, queryQuestions } from "@/lib/questionFilter";

const KIND_OPTIONS: QuestionKind[] = ["single", "sata", "sequence", "grid", "cloze", "bowtie", "hotspot"];

// One toggle button shared by all four facets below -- selected always
// reads as the one signal accent color, regardless of facet, since color no
// longer distinguishes category/type/tag/source from one another (that was
// nes.css-era per-variant coding; the new design reserves color for
// selected/active state only). Laid out 2-per-row (see the grid wrappers
// below) rather than one full-width button per row, since these lists can
// get long (27+ tags in the real question bank).
function ToggleButton({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`border font-mono w-full text-[10px] leading-tight py-2 px-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] ${
        isSelected
          ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
      }`}
    >
      {isSelected ? "✓ " : ""}
      {label.toUpperCase()}
    </button>
  );
}

// Replaces CategoryMode + TypeMode: one screen where category, question
// type, and tags are all independently optional facets of a single query,
// combined via queryQuestions (see src/lib/questionFilter.ts). Selections
// are local, in-progress state -- only the assembled QuestionFilter is
// handed up, on PLAY/MOST WRONG.
export default function FilterMode({
  questions,
  favoriteIds,
  onPlay,
  onMostWrong,
}: {
  questions: Question[];
  favoriteIds: Set<number>;
  onPlay: (filter: QuestionFilter) => void;
  onMostWrong: (filter: QuestionFilter) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [kinds, setKinds] = useState<QuestionKind[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const allCategories = getAllCategories(questions);
  // Tags narrow by selected categories (so the list only shows what's
  // actually relevant), but not by selected type -- keeps the interaction
  // predictable rather than tags disappearing when a type is toggled.
  const tagPool = categories.length > 0 ? getTagsForCategories(questions, categories) : getAllTags(questions);
  const search = tagSearch.trim().toLowerCase();
  const visibleTags = search ? tagPool.filter((t) => t.toLowerCase().includes(search)) : tagPool;
  const allSources = getAllSources(questions);
  const favoriteIdsFilter = favoritesOnly ? [...favoriteIds] : [];

  const filter: QuestionFilter = { categories, kinds, tags, sources, favoriteIds: favoriteIdsFilter };
  const matchCount = queryQuestions(questions, filter).length;

  // A tag selected under the old category set may not exist under the new
  // one -- dropping any that fall outside the new pool avoids an invisible,
  // still-applied tag silently zeroing out matches, the same class of bug
  // just fixed in startPlay.
  function updateCategories(next: string[]) {
    setCategories(next);
    const pool = next.length > 0 ? getTagsForCategories(questions, next) : getAllTags(questions);
    setTags((prev) => prev.filter((t) => pool.includes(t)));
  }

  function toggleCategory(c: string) {
    updateCategories(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c]);
  }

  function clearCategories() {
    updateCategories([]);
  }

  function toggleKind(k: QuestionKind) {
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function toggleSource(s: string) {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">CATEGORY (optional, pick any)</p>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton label="ALL" isSelected={categories.length === 0} onClick={clearCategories} />
          {allCategories.map((c) => (
            <ToggleButton key={c} label={c} isSelected={categories.includes(c)} onClick={() => toggleCategory(c)} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">TYPE (optional, pick any)</p>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton label="ALL" isSelected={kinds.length === 0} onClick={() => setKinds([])} />
          {KIND_OPTIONS.map((k) => (
            <ToggleButton key={k} label={KIND_LABELS[k]} isSelected={kinds.includes(k)} onClick={() => toggleKind(k)} />
          ))}
        </div>
      </div>

      {tagPool.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">TAGS (optional, pick any)</p>
          <input
            type="text"
            className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs px-2 py-1.5 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
            placeholder="Search tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <ToggleButton label="ALL" isSelected={tags.length === 0} onClick={() => setTags([])} />
            {visibleTags.map((t) => {
              // Count for this tag alone (category/type applied, but not
              // combined with any OTHER currently-selected tags) -- with OR
              // semantics, selecting more tags only ever adds matches, so
              // showing each tag's own contribution is more useful at a
              // glance than a combined number that changes depending on
              // what else happens to be selected already.
              const tagMatchCount = queryQuestions(questions, {
                categories,
                kinds,
                tags: [t],
                sources,
                favoriteIds: favoriteIdsFilter,
              }).length;
              return (
                <ToggleButton
                  key={t}
                  label={`${t} (${tagMatchCount})`}
                  isSelected={tags.includes(t)}
                  onClick={() => toggleTag(t)}
                />
              );
            })}
          </div>
          {visibleTags.length === 0 && (
            <p className="font-mono text-xs text-[var(--muted-foreground)]">No tags match &quot;{tagSearch}&quot;.</p>
          )}
        </div>
      )}

      {allSources.length > 1 && (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">SOURCE (optional, pick any)</p>
          <div className="grid grid-cols-2 gap-2">
            <ToggleButton label="ALL" isSelected={sources.length === 0} onClick={() => setSources([])} />
            {allSources.map((s) => (
              <ToggleButton
                key={s}
                label={s.trim() === "" ? "(unknown)" : s}
                isSelected={sources.includes(s)}
                onClick={() => toggleSource(s)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">FAVORITES</p>
        <ToggleButton label="FAVORITES ONLY" isSelected={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)} />
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => onPlay(filter)}
          className="border border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)] font-mono w-full text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          PLAY ({matchCount})
        </button>
        <button
          type="button"
          onClick={() => onMostWrong(filter)}
          className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono w-full text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          MOST WRONG ({matchCount})
        </button>
      </div>
    </div>
  );
}

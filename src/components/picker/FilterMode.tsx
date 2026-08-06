"use client";

import { useState } from "react";
import { Question } from "@/services/questions";
import { getAllCategories, getAllTags, getTagsForCategories } from "@/lib/tags";
import { QuestionKind, KIND_LABELS } from "@/lib/questionKind";
import { QuestionFilter, queryQuestions } from "@/lib/questionFilter";
import { categoryVariant } from "@/lib/categoryVariant";

const KIND_OPTIONS: QuestionKind[] = ["single", "sata", "sequence", "grid"];

// One toggle button shared by all three facets below -- only the selected
// color varies per facet (see callers), so a selected category/kind/tag
// chip never gets confused for one another at a glance. Laid out 2-per-row
// (see the grid wrappers below) rather than one full-width button per row,
// since these lists can get long (27+ tags in the real question bank).
function ToggleButton({
  label,
  isSelected,
  selectedVariant,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  selectedVariant: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`nes-btn ${isSelected ? selectedVariant : ""} w-full font-pixel text-[8px] leading-tight py-2 px-1`}
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
  onPlay,
  onMostWrong,
  onBack,
}: {
  questions: Question[];
  onPlay: (filter: QuestionFilter) => void;
  onMostWrong: (filter: QuestionFilter) => void;
  onBack: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [kinds, setKinds] = useState<QuestionKind[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");

  const allCategories = getAllCategories(questions);
  // Tags narrow by selected categories (so the list only shows what's
  // actually relevant), but not by selected type -- keeps the interaction
  // predictable rather than tags disappearing when a type is toggled.
  const tagPool = categories.length > 0 ? getTagsForCategories(questions, categories) : getAllTags(questions);
  const search = tagSearch.trim().toLowerCase();
  const visibleTags = search ? tagPool.filter((t) => t.toLowerCase().includes(search)) : tagPool;

  const filter: QuestionFilter = { categories, kinds, tags };
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-gray-400">CATEGORY (optional, pick any)</p>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton label="ALL" isSelected={categories.length === 0} selectedVariant="is-warning" onClick={clearCategories} />
          {allCategories.map((c) => (
            <ToggleButton
              key={c}
              label={c}
              isSelected={categories.includes(c)}
              selectedVariant={categoryVariant(c)}
              onClick={() => toggleCategory(c)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-400">TYPE (optional, pick any)</p>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton label="ALL" isSelected={kinds.length === 0} selectedVariant="is-primary" onClick={() => setKinds([])} />
          {KIND_OPTIONS.map((k) => (
            <ToggleButton
              key={k}
              label={KIND_LABELS[k]}
              isSelected={kinds.includes(k)}
              selectedVariant="is-primary"
              onClick={() => toggleKind(k)}
            />
          ))}
        </div>
      </div>

      {tagPool.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">TAGS (optional, pick any)</p>
          <input
            type="text"
            className="nes-input font-pixel text-xs"
            placeholder="Search tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <ToggleButton label="ALL" isSelected={tags.length === 0} selectedVariant="is-success" onClick={() => setTags([])} />
            {visibleTags.map((t) => {
              // Count for this tag alone (category/type applied, but not
              // combined with any OTHER currently-selected tags) -- with OR
              // semantics, selecting more tags only ever adds matches, so
              // showing each tag's own contribution is more useful at a
              // glance than a combined number that changes depending on
              // what else happens to be selected already.
              const tagMatchCount = queryQuestions(questions, { categories, kinds, tags: [t] }).length;
              return (
                <ToggleButton
                  key={t}
                  label={`${t} (${tagMatchCount})`}
                  isSelected={tags.includes(t)}
                  selectedVariant="is-success"
                  onClick={() => toggleTag(t)}
                />
              );
            })}
          </div>
          {visibleTags.length === 0 && (
            <p className="text-xs text-gray-400">No tags match &quot;{tagSearch}&quot;.</p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <button type="button" onClick={() => onPlay(filter)} className="nes-btn is-primary w-full font-pixel text-xs py-2">
          PLAY ({matchCount})
        </button>
        <button type="button" onClick={() => onMostWrong(filter)} className="nes-btn is-error w-full font-pixel text-xs py-2">
          MOST WRONG ({matchCount})
        </button>
      </div>

      <button type="button" onClick={onBack} className="font-pixel text-[10px] text-[var(--text-navy)] underline">
        ← MENU
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { categoryVariant } from "@/lib/categoryVariant";

export default function CategoryMode({
  categories,
  tagsForCategory,
  onStart,
  onStartWrong,
  onBack,
}: {
  categories: string[];
  tagsForCategory: (category: string) => string[];
  onStart: (category: string, tags?: string[]) => void;
  onStartWrong: (category: string, tags?: string[]) => void;
  onBack: () => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function pickCategory(c: string) {
    setCategory(c);
    setSelectedTags([]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  if (!category) {
    return (
      <div className="space-y-3">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pickCategory(c)}
            className={`nes-btn ${categoryVariant(c)} w-full font-pixel text-xs py-2`}
          >
            {c.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={onBack}
          className="font-pixel text-[10px] text-[var(--text-navy)] underline"
        >
          ← MENU
        </button>
      </div>
    );
  }

  const tags = tagsForCategory(category);

  // Tag narrowing is additive, never mandatory: whole-category PLAY/MOST
  // WRONG stay available regardless of selection, and any number of tags
  // can be toggled on together (an intersection filter, not a single pick).
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{category}</p>
      <button
        type="button"
        onClick={() => onStart(category)}
        className="nes-btn is-primary w-full font-pixel text-xs py-2"
      >
        PLAY
      </button>
      <button
        type="button"
        onClick={() => onStartWrong(category)}
        className="nes-btn is-error w-full font-pixel text-xs py-2"
      >
        MOST WRONG
      </button>

      {tags.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mt-2">OR NARROW BY TAG (pick one or more)</p>
          <div className="space-y-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={isSelected}
                  className={`nes-btn ${isSelected ? categoryVariant(tag) : ""} w-full font-pixel text-xs py-2`}
                >
                  {isSelected ? "✓ " : ""}
                  {tag.toUpperCase()}
                </button>
              );
            })}
          </div>

          {selectedTags.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onStart(category, selectedTags)}
                className="nes-btn is-primary w-full font-pixel text-xs py-2"
              >
                PLAY SELECTED ({selectedTags.length})
              </button>
              <button
                type="button"
                onClick={() => onStartWrong(category, selectedTags)}
                className="nes-btn is-error w-full font-pixel text-xs py-2"
              >
                MOST WRONG SELECTED ({selectedTags.length})
              </button>
            </>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setCategory(null)}
        className="font-pixel text-[10px] text-[var(--text-navy)] underline"
      >
        ← CATEGORIES
      </button>
    </div>
  );
}

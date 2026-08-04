"use client";

import { useState } from "react";
import { categoryVariant } from "@/lib/categoryVariant";

export default function CategoryMode({
  categories,
  onStart,
  onStartWrong,
  onBack,
}: {
  categories: string[];
  onStart: (category: string) => void;
  onStartWrong: (category: string) => void;
  onBack: () => void;
}) {
  const [category, setCategory] = useState<string | null>(null);

  if (!category) {
    return (
      <div className="space-y-3">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`nes-btn ${categoryVariant(c)} w-full font-pixel text-xs py-2`}
          >
            {c.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={onBack}
          className="font-pixel text-[10px] text-[#33415c] underline"
        >
          ← MENU
        </button>
      </div>
    );
  }

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
      <button
        type="button"
        onClick={() => setCategory(null)}
        className="font-pixel text-[10px] text-[#33415c] underline"
      >
        ← CATEGORIES
      </button>
    </div>
  );
}

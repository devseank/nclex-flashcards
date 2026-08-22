"use client";

import { useEffect, useRef, useState } from "react";
import { TagColorMap } from "@/services/settings";
import { getTagColor, readableTextColor } from "@/lib/tagColors";
import TagBadge from "@/components/notes/TagBadge";

// No existing combobox/autocomplete primitive in this codebase (Radix's
// Select is a closed dropdown, no free-text entry) -- a plain composed
// input + suggestions list. Fully controlled: `onChange` fires on every
// keystroke (not just on blur/select) so NotesDetail's debounced autosave
// sees the latest value immediately. Substring match against an
// already-fetched vocabulary, same convention as FilterMode.tsx's tag
// search -- no debounce here, there's no network round trip to protect
// against.
//
// Deliberately narrow/compact (not the old full-width input) -- it sits in
// a one-line row next to the note's textarea now, and colors itself with
// the tag's assigned/hashed color live as you type, so it reads as "the
// small colored badge, but editable" rather than a plain text field.
export default function TagCombobox({
  value,
  onChange,
  vocabulary,
  colors,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  vocabulary: string[];
  colors: TagColorMap;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim().toLowerCase();
  const suggestions = trimmed
    ? vocabulary.filter((t) => t.toLowerCase().includes(trimmed) && t.toLowerCase() !== trimmed)
    : vocabulary;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inputStyle = value.trim()
    ? { backgroundColor: getTagColor(colors, value), color: readableTextColor(getTagColor(colors, value)) }
    : undefined;

  return (
    <div ref={containerRef} className="relative w-20 shrink-0">
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Tag"
        style={inputStyle}
        className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-1.5 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] disabled:opacity-60 placeholder:font-normal placeholder:normal-case placeholder:text-[var(--muted-foreground)]"
      />
      {isOpen && !disabled && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 min-w-full w-max max-w-40 max-h-40 overflow-y-auto flex flex-col gap-1 border border-[var(--border)] bg-[var(--surface)] p-1">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              // Prevents the input's blur (which would fire before this
              // click's own onClick) from closing the list first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(tag);
                setIsOpen(false);
              }}
              className="cursor-pointer text-left"
            >
              <TagBadge tag={tag} colors={colors} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

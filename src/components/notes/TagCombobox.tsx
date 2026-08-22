"use client";

import { useEffect, useRef, useState } from "react";

// No existing combobox/autocomplete primitive in this codebase (Radix's
// Select is a closed dropdown, no free-text entry) -- a plain composed
// input + suggestions list. Fully controlled: `onChange` fires on every
// keystroke (not just on blur/select) so NotesDetail's debounced autosave
// sees the latest value immediately. Substring match against an
// already-fetched vocabulary, same convention as FilterMode.tsx's tag
// search -- no debounce here, there's no network round trip to protect
// against.
export default function TagCombobox({
  value,
  onChange,
  vocabulary,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  vocabulary: string[];
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

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Tag (optional)"
        className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs px-2 py-1.5 w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] disabled:opacity-60"
      />
      {isOpen && !disabled && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border border-[var(--border)] bg-[var(--surface)]">
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
              className="cursor-pointer block w-full text-left font-mono text-xs px-2 py-1.5 text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

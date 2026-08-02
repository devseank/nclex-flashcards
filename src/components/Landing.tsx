"use client";

import { useEffect, useRef, useState } from "react";

export type Mode = "quick5" | "quick10" | "infinite";

const MODE_OPTIONS: { key: Mode; label: string }[] = [
  { key: "quick5", label: "QUICK 5" },
  { key: "quick10", label: "QUICK 10" },
  { key: "infinite", label: "INFINITE" },
];

export default function Landing({
  onSelectMode,
  onSelectCategory,
  onSelectAnalytics,
}: {
  onSelectMode: (mode: Mode) => void;
  onSelectCategory: () => void;
  onSelectAnalytics: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open menu"
        aria-expanded={open}
        className="nes-btn is-primary w-full font-pixel text-sm py-3 flex items-center justify-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#12314a]"
      >
        <span aria-hidden="true">☰</span> MENU
      </button>

      {open && (
        <div className="nes-container is-rounded bg-white p-3 space-y-3 absolute left-0 right-0 mt-3 z-10">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onSelectMode(opt.key);
                setOpen(false);
              }}
              className="nes-btn w-full font-pixel text-xs py-2"
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onSelectCategory();
              setOpen(false);
            }}
            className="nes-btn is-warning w-full font-pixel text-xs py-2"
          >
            CATEGORY
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectAnalytics();
              setOpen(false);
            }}
            className="nes-btn is-success w-full font-pixel text-xs py-2"
          >
            ANALYTICS
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PixelWindow({
  title,
  titleExtra,
  headerAction,
  wide,
  children,
}: {
  title: string;
  titleExtra?: React.ReactNode;
  // Overrides the default decorative (non-functional) close button in the
  // top-right corner -- e.g. the home screen's MENU.EXE window passes its
  // account/display-settings dropdown here instead.
  headerAction?: React.ReactNode;
  // Widens the window to max-w-xl (matching the flashcard/analytics cards)
  // instead of the default max-w-sm (sized for the menu/picker screens'
  // short button lists) -- e.g. HISTORY.EXE's entries are full truncated
  // question sentences, not short labels.
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [shake, setShake] = useState(false);

  function handleCloseClick() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  return (
    <div
      className={cn(
        "border border-[var(--border)] bg-[var(--surface)] text-[var(--surface-foreground)]",
        wide ? "max-w-xl" : "max-w-sm",
        "w-full",
        shake && "shake",
      )}
    >
      <div className="border-b border-[var(--border)] flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider">{title}</span>
          {titleExtra}
        </span>
        {headerAction ?? (
          <button
            type="button"
            onClick={handleCloseClick}
            aria-label="Close (not really)"
            className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] leading-none p-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="p-6 text-center space-y-4">{children}</div>
    </div>
  );
}

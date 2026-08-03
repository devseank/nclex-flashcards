"use client";

import { createPortal } from "react-dom";

// Keeps NEXT reachable without scrolling all the way past the rationale --
// portaled to document.body (not just position:fixed in place) for the same
// reason as ConfettiBurst: SessionScreen's entrance-animation wrapper has a
// lingering `transform` (from its fill-mode), which hijacks a plain
// position:fixed descendant into behaving like position:absolute relative
// to that wrapper instead of the real viewport.
export default function StickyNextBar({ onClick }: { onClick: () => void }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-black bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <button
        type="button"
        onClick={onClick}
        className="nes-btn is-primary mx-auto block w-full max-w-xl font-pixel text-xs py-2"
      >
        NEXT
      </button>
    </div>,
    document.body,
  );
}

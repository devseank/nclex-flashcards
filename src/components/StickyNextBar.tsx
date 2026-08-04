"use client";

import { createPortal } from "react-dom";

// Keeps NEXT reachable without scrolling all the way past the rationale --
// portaled to document.body (not just position:fixed in place) for the same
// reason as ConfettiBurst: SessionScreen's entrance-animation wrapper has a
// lingering `transform` (from its fill-mode), which hijacks a plain
// position:fixed descendant into behaving like position:absolute relative
// to that wrapper instead of the real viewport.
//
// Plain position:fixed + bottom:0, deliberately NOT a hand-rolled JS
// position-tracking loop (an earlier version here tried that). The
// remaining glitch on iOS -- Safari's own toolbar chrome briefly painting
// over the page mid-animation -- is the browser's native UI sitting on top
// of ours; it isn't a coordinate problem web-side JS can compute its way
// out of. WebKit's actual fix for viewport-vs-toolbar sizing is the
// dvh/svh/lvh units (Safari 15.4+, see
// https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), which
// this app already leans on via Tailwind's `min-h-dvh` on the page root --
// so the right move is to trust the platform's own mechanism here rather
// than duplicate it with JS.
export default function StickyNextBar({ onClick }: { onClick: () => void }) {
  return createPortal(
    <div className="gpu-layer fixed inset-x-0 bottom-0 z-40 border-t-4 border-black bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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

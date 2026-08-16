"use client";

import { createPortal } from "react-dom";

export type ConfettiConfig = { centerY: number; rotation: number };

// Math.random() must not run during render (React's purity rules), so
// callers build this inside an event handler -- e.g. the moment a correct
// answer is revealed -- and pass the result down as a prop, rather than
// this component rolling its own.
//
// `centerY` captures the document-coordinate vertical center of the
// *current* viewport (scrollY + half the viewport height) at the moment you
// answer, since ConfettiBurst positions itself with a plain document
// coordinate rather than tracking scroll live -- see the component below
// for why. `rotation` gives the stamp its slight "rubber stamp" skew.
export function buildConfettiConfig(): ConfettiConfig {
  const centerY = window.scrollY + window.innerHeight / 2;
  const rotation = Math.random() * 8 - 4;
  return { centerY, rotation };
}

// Brief celebratory stamp on a correct answer -- a HUD-style "[ CORRECT ]"
// glyph stamp, replacing the old rainbow confetti/emoji particle burst
// (dropped for the monochrome+signal-accent design). Purely presentational,
// pure CSS keyframes drive the motion (no JS animation loop or timers), so
// it never delays or blocks anything on screen.
//
// Portaled to document.body and placed with position:absolute at a plain
// document Y coordinate (captured in buildConfettiConfig as `centerY`) --
// NOT position:fixed. iOS Safari has a long-standing bug where a `fixed`
// element that's *dynamically inserted* while the page is already scrolled
// renders at the position it would occupy at scrollY:0 (i.e. up near the
// question) instead of tracking the actual current scroll offset, since
// "fixed" is simulated rather than really viewport-relative there.
// position:absolute at a precomputed document coordinate sidesteps that bug
// class entirely -- it's not simulated, so every engine places it correctly
// on the first paint.
export default function ConfettiBurst({ config }: { config: ConfettiConfig }) {
  const { centerY, rotation } = config;

  return createPortal(
    <div
      className="pointer-events-none absolute z-50"
      style={{ top: centerY, left: "50%", transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      <div className="stamp-in border-4 border-[var(--signal)] text-[var(--signal)] font-mono text-lg uppercase tracking-widest px-4 py-2 whitespace-nowrap">
        ✓ Correct
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { createPortal } from "react-dom";

// Game-themed emoji, shared visual language with the cheer message.
const CONFETTI_EMOJIS = ["🍄", "⭐", "🪙", "⚡", "🔥", "👾", "🎮"];
const CONFETTI_COLORS = ["#f16722", "#35c6c3", "#f7d51d", "#92cc41", "#209cee", "#e76e55", "#a86ee0"];

type Variant = "radial" | "shower" | "sidesweep";
const VARIANTS: Variant[] = ["radial", "shower", "sidesweep"];
const PIECE_COUNT = 11;

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type Piece = {
  content: string | null;
  color: string | undefined;
  angle: number | null;
  drift: number;
  startX: number;
  delay: number;
};

export type ConfettiConfig = { variant: Variant; direction: 1 | -1; pieces: Piece[]; centerY: number };

// Randomizes the burst's shape (radial/shower/sidesweep), direction, and
// whether pieces are colored squares or emoji. Math.random() must not run
// during render (React's purity rules), so callers build this inside an
// event handler -- e.g. the moment a correct answer is revealed -- and pass
// the result down as a prop, rather than this component rolling its own.
//
// `centerY` captures the document-coordinate vertical center of the
// *current* viewport (scrollY + half the viewport height) at the moment you
// answer, since ConfettiBurst positions itself with a plain document
// coordinate rather than tracking scroll live -- see the component below
// for why.
export function buildConfettiConfig(): ConfettiConfig {
  const variant = randomOf(VARIANTS);
  const useEmoji = Math.random() < 0.5;
  const direction = Math.random() < 0.5 ? 1 : -1;
  const centerY = window.scrollY + window.innerHeight / 2;

  const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, (_, i) => ({
    content: useEmoji ? randomOf(CONFETTI_EMOJIS) : null,
    color: useEmoji ? undefined : randomOf(CONFETTI_COLORS),
    angle: variant === "radial" ? (360 / PIECE_COUNT) * i + (Math.random() * 20 - 10) : null,
    // Also fans "sidesweep" pieces apart vertically -- without this they'd
    // all travel the exact same path and visually collapse into one piece.
    drift: Math.random() * 60 - 30,
    // Scatters each piece's starting point across a wide horizontal band
    // instead of a single point, so the burst reads as screen-wide rather
    // than one small cluster.
    startX: Math.random() * 280 - 140,
    delay: i * 20 + Math.random() * 60,
  }));

  return { variant, direction, pieces, centerY };
}

// Brief celebratory burst on a correct answer -- purely presentational, pure
// CSS keyframes drive the actual motion (no JS animation loop or timers), so
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
  const { variant, direction, pieces, centerY } = config;

  return createPortal(
    <div
      className="pointer-events-none absolute z-50 overflow-visible"
      style={{ top: centerY, left: "50%" }}
      aria-hidden="true"
    >
      {pieces.map((piece, i) => (
        <span
          key={i}
          className={`confetti-piece confetti-${variant} absolute ${
            piece.content ? "text-3xl" : "w-4 h-4 border-2 border-black"
          }`}
          style={
            {
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}ms`,
              "--confetti-angle": piece.angle != null ? `${piece.angle}deg` : "0deg",
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-start-x": `${piece.startX}px`,
              "--confetti-direction": direction,
            } as React.CSSProperties
          }
        >
          {piece.content}
        </span>
      ))}
    </div>,
    document.body,
  );
}

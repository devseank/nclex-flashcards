"use client";

// Game-themed emoji, shared visual language with the cheer message.
const CONFETTI_EMOJIS = ["🍄", "⭐", "🪙", "⚡", "🔥", "👾", "🎮"];
const CONFETTI_COLORS = ["#f16722", "#35c6c3", "#f7d51d", "#92cc41", "#209cee", "#e76e55", "#a86ee0"];

type Variant = "radial" | "shower" | "sidesweep";
const VARIANTS: Variant[] = ["radial", "shower", "sidesweep"];
const PIECE_COUNT = 7;

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type Piece = {
  content: string | null;
  color: string | undefined;
  angle: number | null;
  drift: number;
  delay: number;
};

export type ConfettiConfig = { variant: Variant; direction: 1 | -1; pieces: Piece[] };

// Randomizes the burst's shape (radial/shower/sidesweep), direction, and
// whether pieces are colored squares or emoji. Math.random() must not run
// during render (React's purity rules), so callers build this inside an
// event handler -- e.g. the moment a correct answer is revealed -- and pass
// the result down as a prop, rather than this component rolling its own.
export function buildConfettiConfig(): ConfettiConfig {
  const variant = randomOf(VARIANTS);
  const useEmoji = Math.random() < 0.5;
  const direction = Math.random() < 0.5 ? 1 : -1;

  const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, (_, i) => ({
    content: useEmoji ? randomOf(CONFETTI_EMOJIS) : null,
    color: useEmoji ? undefined : randomOf(CONFETTI_COLORS),
    angle: variant === "radial" ? (360 / PIECE_COUNT) * i + (Math.random() * 20 - 10) : null,
    // Also fans "sidesweep" pieces apart vertically -- without this they'd
    // all travel the exact same path and visually collapse into one piece.
    drift: Math.random() * 60 - 30,
    delay: i * 25 + Math.random() * 40,
  }));

  return { variant, direction, pieces };
}

// Brief celebratory burst on a correct answer -- purely presentational, pure
// CSS keyframes drive the actual motion (no JS animation loop or timers), so
// it never delays or blocks anything on screen.
export default function ConfettiBurst({ config }: { config: ConfettiConfig }) {
  const { variant, direction, pieces } = config;

  return (
    // h-32 gives this box an explicit, well-defined height (a box with only
    // absolutely-positioned children and no bottom/height anchor collapses
    // to zero height, which silently breaks `top: 50%` centering on the
    // pieces below). Anchored at the card's own top -- not centered on the
    // full card -- because the card grows tall once revealed (rationale
    // text etc.); centering on that full height could push the burst below
    // the fold on a short mobile viewport. This keeps it right where
    // "CORRECT!" appears, visible immediately without scrolling.
    // z-50: NES.css buttons all set position:relative, making them positioned
    // siblings too -- with z-index:auto on both sides, ties go to DOM order,
    // and the buttons come later, so without an explicit z-index here they'd
    // paint on top of (hiding) the confetti entirely.
    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 z-50 overflow-visible" aria-hidden="true">
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
              "--confetti-direction": direction,
            } as React.CSSProperties
          }
        >
          {piece.content}
        </span>
      ))}
    </div>
  );
}

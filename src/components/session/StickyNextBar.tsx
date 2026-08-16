"use client";

import { createPortal } from "react-dom";

// Keeps NEXT (and, when present, the CHECK action) reachable without
// scrolling all the way past the rationale -- portaled to document.body (not
// just position:fixed in place) for the same reason as ConfettiBurst:
// SessionScreen's entrance-animation wrapper has a lingering `transform`
// (from its fill-mode), which hijacks a plain position:fixed descendant into
// behaving like position:absolute relative to that wrapper instead of the
// real viewport.
//
// Plain position:fixed + bottom:0, deliberately NOT a hand-rolled JS
// position-tracking loop (an earlier version here tried that). The
// remaining glitch on iOS -- Safari's own toolbar chrome briefly painting
// over the page mid-animation -- is the browser's native UI sitting on top
// of ours; it isn't a coordinate problem web-side JS can compute its way
// out of. WebKit's actual fix for viewport-vs-toolbar sizing is the
// dvh/svh/lvh units (Safari 15.4+, see
// https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), which
// this app already leans on via Tailwind's `min-h-dvh` on the page root.
//
// FOOTER_BUFFER gives the bar a sacrificial empty "footer" strip below the
// button, roughly as tall as Safari's collapsed toolbar. If that chrome
// does intrude on the bottom of the page mid-animation, it eats into this
// empty padding first rather than the button itself.
const FOOTER_BUFFER = "3.5rem";

export type StickyActionBarCheck = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

// A disabled button swaps to a flat muted fill rather than dimming the
// signal-accent fill with opacity -- opacity alone reads as "still active,
// just faded" rather than clearly inert.
function actionButtonClass(disabled: boolean | undefined): string {
  return disabled
    ? "border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
    : "border border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]";
}

const BUTTON_BASE =
  "flex-1 font-mono text-xs uppercase tracking-wider py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]";

export default function StickyNextBar({
  onClick,
  disabled = false,
  check,
}: {
  onClick: () => void;
  disabled?: boolean;
  check?: StickyActionBarCheck;
}) {
  return createPortal(
    <div
      className="gpu-layer fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3"
      style={{ paddingBottom: `calc(${FOOTER_BUFFER} + env(safe-area-inset-bottom))` }}
    >
      <div className="mx-auto flex w-full max-w-xl gap-3">
        {check && (
          <button
            type="button"
            disabled={check.disabled}
            onClick={check.onClick}
            className={`${BUTTON_BASE} ${actionButtonClass(check.disabled)}`}
          >
            {check.label}
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`${BUTTON_BASE} ${actionButtonClass(disabled)}`}
        >
          NEXT
        </button>
      </div>
    </div>,
    document.body,
  );
}

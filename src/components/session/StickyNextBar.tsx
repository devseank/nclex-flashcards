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

// A disabled button swaps to nes.css's own is-disabled variant (a flat grey
// fill) rather than dimming is-primary's blue with opacity -- opacity alone
// reads as "still blue, just faded" rather than clearly inert, and nes.css's
// own :active press effect is only suppressed for buttons carrying the
// is-disabled class (see nes.css's `:active:not(.is-disabled)` rules), so
// this also stops the pressed-in shadow shift from flashing on a tap that
// isn't actually going to do anything.
function actionButtonVariant(disabled: boolean | undefined): string {
  return disabled ? "is-disabled" : "is-primary";
}

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
      className="gpu-layer fixed inset-x-0 bottom-0 z-40 border-t-4 border-black bg-white px-4 pt-3"
      style={{ paddingBottom: `calc(${FOOTER_BUFFER} + env(safe-area-inset-bottom))` }}
    >
      <div className="mx-auto flex w-full max-w-xl gap-3">
        {check && (
          <button
            type="button"
            disabled={check.disabled}
            onClick={check.onClick}
            className={`nes-btn flex-1 font-pixel text-xs py-2 ${actionButtonVariant(check.disabled)}`}
          >
            {check.label}
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`nes-btn flex-1 font-pixel text-xs py-2 ${actionButtonVariant(disabled)}`}
        >
          NEXT
        </button>
      </div>
    </div>,
    document.body,
  );
}

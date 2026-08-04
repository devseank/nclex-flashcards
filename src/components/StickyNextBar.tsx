"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

// Keeps NEXT reachable without scrolling all the way past the rationale --
// portaled to document.body (not just position:fixed in place) for the same
// reason as ConfettiBurst: SessionScreen's entrance-animation wrapper has a
// lingering `transform` (from its fill-mode), which hijacks a plain
// position:fixed descendant into behaving like position:absolute relative
// to that wrapper instead of the real viewport.
//
// Deliberately NOT position:fixed. iOS Safari's collapsing address/tab-bar
// chrome resizes the *visual* viewport independently of the layout viewport
// `fixed` tracks, and that chrome can finish re-showing itself (e.g. once
// you hit the true bottom of the page, nothing left to scroll) slightly
// AFTER the last scroll/resize event fires -- so relying only on those
// events still raced that final chrome transition in testing. A
// requestAnimationFrame loop instead recomputes the bar's real document
// Y-coordinate (`scrollY + visible-area-bottom - barHeight`) every frame
// for as long as this is mounted, so it's self-correcting on the very next
// frame regardless of which event iOS did or didn't fire. The event
// listeners below are just a redundant, immediate-correction fallback in
// case rAF is ever throttled -- either path alone would work; both cost
// little to keep together.
//
// Even with that, there's a brief window mid-gesture where Safari's own
// native chrome is physically painting over the bottom of the page while
// only *partially* expanded -- that's the browser's own UI layer sitting
// on top of ours, not something any web-side positioning fix can reach
// into. CLEARANCE_PX nudges the bar up a bit from the bare-minimum edge so
// that transient partial overlap is less likely to cover it; it settles to
// the exact edge as soon as the native animation finishes and fires a
// real resize/scroll event.
const CLEARANCE_PX = 24;

export default function StickyNextBar({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    function reposition() {
      const bar = ref.current;
      if (!bar) return;
      const vv = window.visualViewport;
      const visibleBottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - CLEARANCE_PX;
      const top = `${window.scrollY + visibleBottom - bar.offsetHeight}px`;
      if (bar.style.top !== top) bar.style.top = top;
    }

    function loop() {
      reposition();
      rafId = requestAnimationFrame(loop);
    }

    reposition(); // avoid a flash of unstyled position before the first rAF tick
    rafId = requestAnimationFrame(loop);
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };
  }, []);

  return createPortal(
    <div
      ref={ref}
      className="gpu-layer absolute inset-x-0 z-40 border-t-4 border-black bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
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

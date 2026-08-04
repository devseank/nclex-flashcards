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
// iOS Safari's collapsing address/tab-bar chrome changes the *visual*
// viewport without `position: fixed`'s frame of reference (the layout
// viewport) staying in sync during that animation -- a plain `bottom: 0`
// intermittently ends up hidden behind/under wherever the chrome currently
// is, so the bar flickers out of view depending on scroll direction.
// window.visualViewport exists specifically to report the real, current
// visible area, so this tracks it directly and corrects position via
// `transform` rather than trusting `bottom: 0` alone.
export default function StickyNextBar({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function reposition() {
      if (!ref.current) return;
      const offset = Math.max(0, window.innerHeight - (vv!.height + vv!.offsetTop));
      // translateZ(0) keeps the element on its own stable GPU layer
      // (avoids the separate repaint-during-scroll bug from backdrop-filter
      // + fixed); translateY corrects for the visual-viewport offset.
      ref.current.style.transform = `translateZ(0) translateY(-${offset}px)`;
    }

    reposition();
    vv.addEventListener("resize", reposition);
    vv.addEventListener("scroll", reposition);
    return () => {
      vv.removeEventListener("resize", reposition);
      vv.removeEventListener("scroll", reposition);
    };
  }, []);

  return createPortal(
    <div
      ref={ref}
      className="sticky-fixed fixed inset-x-0 bottom-0 z-40 border-t-4 border-black bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
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

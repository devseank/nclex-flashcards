"use client";

import { useState } from "react";

export default function PixelWindow({
  title,
  titleExtra,
  headerAction,
  children,
}: {
  title: string;
  titleExtra?: React.ReactNode;
  // Overrides the default decorative (non-functional) close button in the
  // top-right corner -- e.g. the home screen's MENU.EXE window passes its
  // account/display-settings dropdown here instead.
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [shake, setShake] = useState(false);

  function handleCloseClick() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  return (
    <div
      className={`nes-container is-rounded bg-white max-w-sm w-full p-0 ${shake ? "shake" : ""}`}
    >
      <div className="bg-[#12314a] flex items-center justify-between px-3 py-2">
        <span className="flex items-center">
          <span className="font-pixel text-[10px] text-white">{title}</span>
          {titleExtra}
        </span>
        {headerAction ?? (
          <button
            type="button"
            onClick={handleCloseClick}
            aria-label="Close (not really)"
            className="cursor-pointer bg-[#faf1de] border-2 border-black leading-none p-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-navy-strong)]"
          >
            <i className="nes-icon close is-small m-0 block" />
          </button>
        )}
      </div>
      <div className="p-6 text-center space-y-4">{children}</div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function PixelWindow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [shake, setShake] = useState(false);

  function handleCloseClick() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  return (
    <div
      className={`nes-container is-rounded bg-white max-w-sm w-full p-0 overflow-hidden ${shake ? "shake" : ""}`}
    >
      <div className="bg-[#12314a] flex items-center justify-between px-3 py-2">
        <span className="font-pixel text-[10px] text-white">{title}</span>
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label="Close (not really)"
          className="cursor-pointer bg-[#faf1de] border-2 border-black leading-none p-1 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#12314a]"
        >
          <i className="nes-icon close is-small m-0 block" />
        </button>
      </div>
      <div className="p-6 text-center space-y-4">{children}</div>
    </div>
  );
}

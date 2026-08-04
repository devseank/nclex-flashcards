"use client";

import { useState } from "react";

export default function AnimatedHeart() {
  const [bursts, setBursts] = useState<{ id: number; offset: number }[]>([]);

  function handleClick() {
    const id = Date.now() + Math.random();
    const offset = Math.round((Math.random() - 0.5) * 40);
    setBursts((prev) => [...prev, { id, offset }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 800);
  }

  return (
    <div className="relative h-24 flex items-center justify-center">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Boop the heart"
        className="cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-navy-strong)]"
      >
        <span className="heartbeat inline-block">
          <i className="nes-icon heart is-large m-0 block" />
        </span>
      </button>
      {bursts.map((b) => (
        <span
          key={b.id}
          className="burst-heart absolute pointer-events-none inline-block"
          style={{ left: `calc(50% + ${b.offset}px)`, top: "calc(50% - 8px)" }}
        >
          <i className="nes-icon heart is-small m-0 block" />
        </span>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { QuestionKind, KIND_LABELS } from "@/lib/questionKind";

const KIND_OPTIONS: { key: QuestionKind; label: string; variant: string }[] = [
  { key: "single", label: KIND_LABELS.single, variant: "is-primary" },
  { key: "sata", label: KIND_LABELS.sata, variant: "is-warning" },
  { key: "sequence", label: KIND_LABELS.sequence, variant: "is-success" },
];

export default function TypeMode({
  onStart,
  onStartWrong,
  onBack,
}: {
  onStart: (kind: QuestionKind) => void;
  onStartWrong: (kind: QuestionKind) => void;
  onBack: () => void;
}) {
  const [kind, setKind] = useState<QuestionKind | null>(null);

  if (!kind) {
    return (
      <div className="space-y-3">
        {KIND_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setKind(opt.key)}
            className={`nes-btn ${opt.variant} w-full font-pixel text-xs py-2`}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onBack}
          className="font-pixel text-[10px] text-[#33415c] underline"
        >
          ← MENU
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{KIND_LABELS[kind]}</p>
      <button
        type="button"
        onClick={() => onStart(kind)}
        className="nes-btn is-primary w-full font-pixel text-xs py-2"
      >
        PLAY
      </button>
      <button
        type="button"
        onClick={() => onStartWrong(kind)}
        className="nes-btn is-error w-full font-pixel text-xs py-2"
      >
        MOST WRONG
      </button>
      <button
        type="button"
        onClick={() => setKind(null)}
        className="font-pixel text-[10px] text-[#33415c] underline"
      >
        ← TYPES
      </button>
    </div>
  );
}

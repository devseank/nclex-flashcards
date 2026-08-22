"use client";

import { useEffect, useRef, useState } from "react";
import { HotspotQuestion } from "@/services/questions";
import { HotspotResponse } from "@/lib/quizLogic";
import { QuestionStats } from "@/services/attempts";
import { Note } from "@/services/notes";
import { ConfettiConfig, buildConfettiConfig } from "@/components/session/ConfettiBurst";
import FlashcardShell, { FlashcardMode } from "@/components/session/FlashcardShell";

type ContentRect = { left: number; top: number; width: number; height: number };

// `object-contain` letterboxes whenever the image's own aspect ratio
// doesn't match its rendered box -- this computes the actual visible
// content rect, in pixels *relative to the image element's own top-left*
// (i.e. the letterbox margin, not a viewport coordinate), which is what
// both the click handler and the reveal-time overlays need to measure
// against. Requires the image to already be loaded (naturalWidth/Height
// populated) -- see the onLoad/resize wiring below.
function imageContentRect(img: HTMLImageElement): ContentRect {
  const box = img.getBoundingClientRect();
  const boxRatio = box.width / box.height;
  const naturalRatio = img.naturalWidth / img.naturalHeight;
  if (naturalRatio > boxRatio) {
    const width = box.width;
    const height = width / naturalRatio;
    return { left: 0, top: (box.height - height) / 2, width, height };
  }
  const height = box.height;
  const width = height * naturalRatio;
  return { left: (box.width - width) / 2, top: 0, width, height };
}

export default function HotspotFlashcard({
  headerLeft,
  headerAction,
  question,
  onNext,
  mode = "immediate",
  initialSelected,
  stats,
  isFavorited,
  onToggleFavorite,
  note,
  onOpenNote,
}: {
  headerLeft?: React.ReactNode;
  headerAction?: React.ReactNode;
  question: HotspotQuestion;
  onNext?: (selected: HotspotResponse) => void;
  mode?: FlashcardMode;
  initialSelected?: HotspotResponse;
  stats?: QuestionStats;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  note?: Note;
  onOpenNote?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [clickPoint, setClickPoint] = useState<HotspotResponse | null>(initialSelected ?? null);
  const [contentRect, setContentRect] = useState<ContentRect | null>(null);
  const [revealed, setRevealed] = useState(mode === "review");
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig | null>(null);

  const showAnswer = mode === "review" || revealed;

  function updateContentRect() {
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) setContentRect(imageContentRect(img));
  }

  // Recomputed on load (the image's real dimensions aren't known before
  // then) and on resize (a rotation/viewport change can change the
  // rendered box, and thus the letterbox math, even mid-review).
  useEffect(() => {
    updateContentRect();
    window.addEventListener("resize", updateContentRect);
    return () => window.removeEventListener("resize", updateContentRect);
  }, []);

  function isCorrectPoint(point: HotspotResponse | null): boolean {
    if (!point) return false;
    const r = question.hotspotRegion;
    return point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height;
  }

  const isFullyCorrect = showAnswer && isCorrectPoint(clickPoint);

  function reveal() {
    // Math.random() (inside buildConfettiConfig) must not run during render,
    // so it's built here in the event handler, not derived from state later.
    if (isCorrectPoint(clickPoint)) setConfettiConfig(buildConfettiConfig());
    setRevealed(true);
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (showAnswer || !imgRef.current) return;
    const rect = imageContentRect(imgRef.current);
    const box = imgRef.current.getBoundingClientRect();
    const xFrac = (e.clientX - box.left - rect.left) / rect.width;
    const yFrac = (e.clientY - box.top - rect.top) / rect.height;
    if (xFrac < 0 || xFrac > 1 || yFrac < 0 || yFrac > 1) return; // landed in the letterbox margin
    setClickPoint({ x: xFrac, y: yFrac });
  }

  return (
    <FlashcardShell
      headerLeft={headerLeft}
      headerAction={headerAction}
      question={question}
      stats={stats}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
      note={note}
      onOpenNote={onOpenNote}
      mode={mode}
      showAnswer={showAnswer}
      isFullyCorrect={isFullyCorrect}
      confettiConfig={confettiConfig}
      instruction={!showAnswer ? "Tap the correct location on the image below." : undefined}
      onNextClick={() => onNext?.(clickPoint ?? { x: -1, y: -1 })}
      nextDisabled={!showAnswer}
      check={!showAnswer ? { label: "CHECK ANSWER", onClick: reveal, disabled: !clickPoint } : undefined}
    >
      {question.imageUrl && (
        <div className="relative w-full h-80 border border-[var(--border)] overflow-hidden bg-[var(--muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export (next/image needs no server either way, this app already sets images.unoptimized) */}
          <img
            ref={imgRef}
            src={question.imageUrl}
            alt="Question illustration -- tap the correct location"
            onLoad={updateContentRect}
            onClick={handleImageClick}
            className={`w-full h-full object-contain block ${showAnswer ? "" : "cursor-pointer"}`}
          />

          {contentRect && clickPoint && (
            // Filled = a hit (provisional pick, or confirmed correct); hollow
            // outline-only = confirmed miss -- distinguishing "hit" vs "miss"
            // by fill instead of a second color, per the one-signal-accent
            // rule (no red).
            <span
              aria-hidden="true"
              className="absolute rounded-full border-2 border-[var(--foreground)] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: contentRect.left + clickPoint.x * contentRect.width,
                top: contentRect.top + clickPoint.y * contentRect.height,
                width: 20,
                height: 20,
                backgroundColor: showAnswer && !isFullyCorrect ? "transparent" : "var(--signal)",
              }}
            />
          )}

          {contentRect && showAnswer && (
            <span
              aria-hidden="true"
              className="absolute border-2 border-[var(--signal)] pointer-events-none"
              style={{
                left: contentRect.left + question.hotspotRegion.x * contentRect.width,
                top: contentRect.top + question.hotspotRegion.y * contentRect.height,
                width: question.hotspotRegion.width * contentRect.width,
                height: question.hotspotRegion.height * contentRect.height,
              }}
            />
          )}
        </div>
      )}

      {showAnswer && question.rationale && (
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
          <p className="text-lg leading-snug">{question.rationale}</p>
        </div>
      )}
    </FlashcardShell>
  );
}

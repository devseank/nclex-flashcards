"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { supabase } from "@/lib/supabase";
import Flashcard from "@/components/Flashcard";
import Landing, { Mode } from "@/components/Landing";
import PixelWindow from "@/components/PixelWindow";

const MODE_LABELS: Record<Mode, string> = {
  quick5: "QUICK 5",
  quick10: "QUICK 10",
  infinite: "INFINITE",
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(pool: Question[], excludeId?: number): Question {
  const filtered = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function isCorrect(question: Question, selected: number[]): boolean {
  return (
    selected.length === question.correctIndices.length &&
    selected.every((i) => question.correctIndices.includes(i))
  );
}

export default function FlashcardApp() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchAllQuestions()
      .then(setQuestions)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function startMode(m: Mode) {
    if (!questions) return;
    setMode(m);
    setFinished(false);
    setAnswers([]);
    if (m === "infinite") {
      setCurrent(pickRandom(questions));
    } else {
      const count = m === "quick5" ? 5 : 10;
      const nextQueue = shuffle(questions).slice(0, Math.min(count, questions.length));
      setQueue(nextQueue);
      setIndex(0);
      setCurrent(nextQueue[0]);
    }
  }

  function backToMenu() {
    setMode(null);
    setFinished(false);
    setCurrent(null);
  }

  function handleNext(selected: number[]) {
    if (mode === "infinite") {
      setCurrent((prev) => pickRandom(questions!, prev?.id));
      return;
    }

    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);

    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setFinished(true);
      setCurrent(null);
      return;
    }
    setIndex(nextIndex);
    setCurrent(queue[nextIndex]);
  }

  const score = queue.reduce(
    (acc, q, i) => acc + (isCorrect(q, answers[i] ?? []) ? 1 : 0),
    0,
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="font-pixel text-[10px] text-[#33415c] underline"
      >
        Sign out
      </button>

      {error && (
        <p className="font-pixel text-sm text-[#33415c] text-center leading-relaxed">{error}</p>
      )}

      {!error && questions && !mode && !finished && (
        <PixelWindow title="MENU.EXE">
          <Landing onSelect={startMode} />
        </PixelWindow>
      )}

      {!error && finished && mode && (
        <div className="w-full max-w-xl flex flex-col items-center gap-6">
          <PixelWindow title="DONE.EXE">
            <p className="text-base">
              You scored {score} / {queue.length} on {MODE_LABELS[mode]}.
            </p>
            <button
              type="button"
              onClick={backToMenu}
              className="nes-btn is-primary w-full font-pixel text-xs py-2"
            >
              BACK TO MENU
            </button>
          </PixelWindow>

          <div className="w-full flex flex-col gap-4">
            {queue.map((q, i) => (
              <Flashcard key={q.id} question={q} mode="review" initialSelected={answers[i] ?? []} />
            ))}
          </div>
        </div>
      )}

      {!error && mode && current && (
        <div className="w-full max-w-xl flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between px-1">
            <button
              type="button"
              onClick={backToMenu}
              className="font-pixel text-[10px] text-[#33415c] underline"
            >
              ← MENU
            </button>
            {mode !== "infinite" && (
              <span className="font-pixel text-[10px] text-[#33415c]">
                {index + 1} / {queue.length}
              </span>
            )}
          </div>
          <Flashcard
            key={current.id}
            question={current}
            mode={mode === "infinite" ? "immediate" : "deferred"}
            onNext={handleNext}
          />
        </div>
      )}
    </div>
  );
}

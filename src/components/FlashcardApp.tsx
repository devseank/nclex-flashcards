"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { recordAttempt } from "@/services/attempts";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorMessage";
import Flashcard from "@/components/Flashcard";
import Landing, { Mode } from "@/components/Landing";
import CategoryMode from "@/components/CategoryMode";
import Analytics from "@/components/Analytics";
import PixelWindow from "@/components/PixelWindow";

type View = "menu" | "categoryPick" | "session" | "finished" | "analytics";

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

  const [view, setView] = useState<View>("menu");
  const [mode, setMode] = useState<Mode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);

  useEffect(() => {
    fetchAllQuestions()
      .then(setQuestions)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const categories = questions ? [...new Set(questions.map((q) => q.category))].sort() : [];

  function startMode(m: Mode, category: string | null = null) {
    if (!questions) return;
    const pool = category ? questions.filter((q) => q.category === category) : questions;
    if (pool.length === 0) return;

    setMode(m);
    setCategoryFilter(category);
    setAnswers([]);
    setView("session");

    if (m === "infinite") {
      setQueue(pool);
      setCurrent(pickRandom(pool));
    } else {
      const count = m === "quick5" ? 5 : 10;
      const nextQueue = shuffle(pool).slice(0, Math.min(count, pool.length));
      setQueue(nextQueue);
      setIndex(0);
      setCurrent(nextQueue[0]);
    }
  }

  function backToMenu() {
    setView("menu");
    setMode(null);
    setCategoryFilter(null);
    setCurrent(null);
  }

  function handleNext(selected: number[]) {
    if (current && selected.length > 0) {
      recordAttempt(current.id, selected, isCorrect(current, selected)).catch((err) =>
        console.error("Failed to record attempt:", err),
      );
    }

    if (mode === "infinite") {
      setCurrent((prev) => pickRandom(queue, prev?.id));
      return;
    }

    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);

    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setView("finished");
      setCurrent(null);
      return;
    }
    setIndex(nextIndex);
    setCurrent(queue[nextIndex]);
  }

  const score = queue.reduce((acc, q, i) => acc + (isCorrect(q, answers[i] ?? []) ? 1 : 0), 0);
  const modeTitle =
    mode && (categoryFilter ? `${categoryFilter} — ${MODE_LABELS[mode]}` : MODE_LABELS[mode]);

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

      {!error && questions && view === "menu" && (
        <PixelWindow title="MENU.EXE">
          <Landing
            onSelectMode={(m) => startMode(m)}
            onSelectCategory={() => setView("categoryPick")}
            onSelectAnalytics={() => setView("analytics")}
          />
        </PixelWindow>
      )}

      {!error && view === "categoryPick" && (
        <PixelWindow title="CATEGORY.EXE">
          <CategoryMode
            categories={categories}
            onStart={(category, m) => startMode(m, category)}
            onBack={backToMenu}
          />
        </PixelWindow>
      )}

      {!error && view === "analytics" && questions && (
        <Analytics questions={questions} onBack={backToMenu} />
      )}

      {!error && view === "finished" && mode && (
        <div className="w-full max-w-xl flex flex-col items-center gap-6">
          <PixelWindow title="DONE.EXE">
            <p className="text-base">
              You scored {score} / {queue.length} on {modeTitle}.
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

      {!error && view === "session" && mode && current && (
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

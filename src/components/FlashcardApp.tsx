"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import {
  recordAttempt,
  fetchAttempts,
  computeQuestionStats,
  Attempt,
  QuestionStats,
} from "@/services/attempts";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek } from "@/lib/dateRanges";
import Flashcard from "@/components/Flashcard";
import Landing, { Mode } from "@/components/Landing";
import CategoryMode from "@/components/CategoryMode";
import ReviewMode, { ReviewRange } from "@/components/ReviewMode";
import Analytics from "@/components/Analytics";
import PixelWindow from "@/components/PixelWindow";

type SessionMode = Mode | "review";
type View = "menu" | "categoryPick" | "reviewPick" | "session" | "finished" | "analytics";

const MODE_LABELS: Record<SessionMode, string> = {
  quick5: "QUICK 5",
  quick10: "QUICK 10",
  infinite: "INFINITE",
  review: "REVIEW",
};

const REVIEW_RANGE_LABELS: Record<ReviewRange, string> = {
  today: "TODAY",
  week: "THIS WEEK",
  all: "ALL TIME",
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

function selectMostWrong(pool: Question[], attempts: Attempt[], since: Date | null): Question[] {
  const relevant = since ? attempts.filter((a) => new Date(a.attemptedAt) >= since) : attempts;
  const incorrectCounts = new Map<number, number>();
  for (const a of relevant) {
    if (!a.isCorrect) {
      incorrectCounts.set(a.questionId, (incorrectCounts.get(a.questionId) ?? 0) + 1);
    }
  }
  return pool
    .filter((q) => (incorrectCounts.get(q.id) ?? 0) > 0)
    .sort((a, b) => (incorrectCounts.get(b.id) ?? 0) - (incorrectCounts.get(a.id) ?? 0));
}

export default function FlashcardApp() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>("menu");
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [questionStats, setQuestionStats] = useState<Map<number, QuestionStats> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchAllQuestions()
      .then(setQuestions)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const categories = questions ? [...new Set(questions.map((q) => q.category))].sort() : [];

  function beginSession(pool: Question[], m: SessionMode, label: string, category: string | null) {
    setMode(m);
    setCategoryFilter(category);
    setSessionLabel(label);
    setAnswers([]);
    setNotice(null);
    setView("session");

    if (m === "infinite") {
      setQueue(pool);
      setCurrent(pickRandom(pool));
    } else {
      setQueue(pool);
      setIndex(0);
      setCurrent(pool[0]);
    }
  }

  function startMode(m: Mode, category: string | null = null) {
    if (!questions) return;
    const pool = category ? questions.filter((q) => q.category === category) : questions;
    if (pool.length === 0) return;

    if (m === "infinite") {
      beginSession(pool, m, "", category);
    } else {
      const count = m === "quick5" ? 5 : 10;
      beginSession(shuffle(pool).slice(0, Math.min(count, pool.length)), m, "", category);
    }
  }

  async function startReviewByRange(range: ReviewRange) {
    if (!questions) return;
    const since = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : null;

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(questions, attempts, since);
      if (mostWrong.length === 0) {
        setNotice("No incorrect answers in this period — nice work!");
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `REVIEW — ${REVIEW_RANGE_LABELS[range]}`, null);
    } catch (err) {
      setNotice(getErrorMessage(err));
    }
  }

  async function startReviewByCategory(category: string) {
    if (!questions) return;
    const pool = questions.filter((q) => q.category === category);

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(pool, attempts, null);
      if (mostWrong.length === 0) {
        setNotice("No incorrect answers in this category — nice work!");
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `${category} — MOST WRONG`, category);
    } catch (err) {
      setNotice(getErrorMessage(err));
    }
  }

  function backToMenu() {
    setView("menu");
    setMode(null);
    setCategoryFilter(null);
    setSessionLabel("");
    setCurrent(null);
    setQuestionStats(null);
    setNotice(null);
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
    mode === "review"
      ? sessionLabel
      : mode && (categoryFilter ? `${categoryFilter} — ${MODE_LABELS[mode]}` : MODE_LABELS[mode]);

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
            onSelectCategory={() => {
              setNotice(null);
              setView("categoryPick");
            }}
            onSelectReview={() => {
              setNotice(null);
              setView("reviewPick");
            }}
            onSelectAnalytics={() => setView("analytics")}
          />
        </PixelWindow>
      )}

      {!error && view === "categoryPick" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <PixelWindow title="CATEGORY.EXE">
            <CategoryMode
              categories={categories}
              onStart={(category, m) => startMode(m, category)}
              onStartWrong={startReviewByCategory}
              onBack={backToMenu}
            />
          </PixelWindow>
          {notice && <p className="text-sm text-gray-500 text-center">{notice}</p>}
        </div>
      )}

      {!error && view === "reviewPick" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <PixelWindow title="REVIEW.EXE">
            <ReviewMode onSelect={startReviewByRange} onBack={backToMenu} />
          </PixelWindow>
          {notice && <p className="text-sm text-gray-500 text-center">{notice}</p>}
        </div>
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
              <Flashcard
                key={q.id}
                question={q}
                mode="review"
                initialSelected={answers[i] ?? []}
                stats={questionStats?.get(q.id)}
              />
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
            onNext={handleNext}
            stats={mode === "review" ? questionStats?.get(current.id) : undefined}
          />
        </div>
      )}
    </div>
  );
}

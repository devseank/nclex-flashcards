"use client";

import { useState } from "react";
import { Question } from "@/services/questions";
import {
  recordAttempt,
  fetchAttempts,
  computeQuestionStats,
  QuestionStats,
} from "@/services/attempts";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek } from "@/lib/dateRanges";
import { SessionMode, shuffle, pickRandom, isCorrect, selectMostWrong, selectUnattempted, selectLeastRecentlyTried } from "@/lib/quizLogic";
import { Mode } from "@/components/Landing";
import { ReviewRange } from "@/components/ReviewMode";
import { NewRange } from "@/components/NewMode";

export type View = "menu" | "categoryPick" | "reviewPick" | "newPick" | "session" | "finished" | "analytics";

export type Notice = { text: string; tone: "info" | "error" };

const MODE_LABELS: Record<SessionMode, string> = {
  quick5: "QUICK 5",
  quick10: "QUICK 10",
  infinite: "INFINITE",
  review: "REVIEW",
  new: "NEW",
};

const REVIEW_RANGE_LABELS: Record<ReviewRange, string> = {
  today: "TODAY",
  week: "THIS WEEK",
  all: "ALL TIME",
  stale: "LEAST RECENT",
};

const NEW_RANGE_LABELS: Record<NewRange, string> = {
  today: "NEW",
  week: "NEWER",
  all: "NEWEST",
};

// Owns all quiz-session state and the actions that transition between
// screens (start a mode/category/review, answer a question, return to
// menu). FlashcardApp just wires this up to the right screen components.
export function useQuizSession(questions: Question[] | null) {
  const [view, setView] = useState<View>("menu");
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [questionStats, setQuestionStats] = useState<Map<number, QuestionStats> | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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

    try {
      const attempts = await fetchAttempts();

      if (range === "stale") {
        const leastRecentlyTried = selectLeastRecentlyTried(questions, attempts);
        if (leastRecentlyTried.length === 0) {
          setNotice({ text: "No attempted questions yet — answer a few first!", tone: "info" });
          return;
        }
        setQuestionStats(computeQuestionStats(attempts));
        beginSession(leastRecentlyTried, "review", `REVIEW — ${REVIEW_RANGE_LABELS[range]}`, null);
        return;
      }

      const since = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : null;
      const mostWrong = selectMostWrong(questions, attempts, since);
      if (mostWrong.length === 0) {
        setNotice({ text: "No incorrect answers in this period — nice work!", tone: "info" });
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `REVIEW — ${REVIEW_RANGE_LABELS[range]}`, null);
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
    }
  }

  async function startNewByRange(range: NewRange) {
    if (!questions) return;
    const since = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : null;

    try {
      const attempts = await fetchAttempts();
      const unattempted = selectUnattempted(questions, attempts, since);
      if (unattempted.length === 0) {
        setNotice({ text: "No unattempted questions in this period — you've seen them all!", tone: "info" });
        return;
      }
      beginSession(unattempted, "new", `${NEW_RANGE_LABELS[range]} QUESTIONS`, null);
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
    }
  }

  async function startReviewByCategory(category: string) {
    if (!questions) return;
    const pool = questions.filter((q) => q.category === category);

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(pool, attempts, null);
      if (mostWrong.length === 0) {
        setNotice({ text: `No incorrect answers in ${category} — nice work!`, tone: "info" });
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `${category} — MOST WRONG`, category);
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
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

  function goToCategoryPick() {
    setNotice(null);
    setView("categoryPick");
  }

  function goToReviewPick() {
    setNotice(null);
    setView("reviewPick");
  }

  function goToNewPick() {
    setNotice(null);
    setView("newPick");
  }

  function goToAnalytics() {
    setView("analytics");
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
    mode === "review" || mode === "new"
      ? sessionLabel
      : mode && (categoryFilter ? `${categoryFilter} — ${MODE_LABELS[mode]}` : MODE_LABELS[mode]);

  return {
    view,
    mode,
    queue,
    index,
    current,
    answers,
    questionStats,
    notice,
    score,
    modeTitle,
    startMode,
    startReviewByRange,
    startReviewByCategory,
    startNewByRange,
    backToMenu,
    goToCategoryPick,
    goToReviewPick,
    goToNewPick,
    goToAnalytics,
    handleNext,
  };
}

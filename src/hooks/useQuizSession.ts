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
import { matchesFilter } from "@/lib/tags";
import { SessionMode, pickRandom, isCorrect, selectMostWrong, selectUnattempted, selectLeastRecentlyTried } from "@/lib/quizLogic";
import { QuestionKind, KIND_LABELS, matchesKind } from "@/lib/questionKind";
import { ReviewRange } from "@/components/ReviewMode";
import { NewRange } from "@/components/NewMode";
import { HistoryLimit } from "@/components/HistoryMode";
import { HistoryEntry } from "@/components/HistoryList";

export type View =
  | "menu"
  | "categoryPick"
  | "typePick"
  | "reviewPick"
  | "newPick"
  | "historyPick"
  | "historyList"
  | "historyDetail"
  | "session"
  | "finished"
  | "analytics";

export type Notice = { text: string; tone: "info" | "error" };

const MODE_LABELS: Record<SessionMode, string> = {
  infinite: "PLAY",
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
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [questionStats, setQuestionStats] = useState<Map<number, QuestionStats> | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyDetailEntry, setHistoryDetailEntry] = useState<HistoryEntry | null>(null);

  function beginSession(pool: Question[], m: SessionMode, label: string, filter: string | null) {
    setMode(m);
    setFilterLabel(filter);
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

  function startPlay(category: string | null = null, tags: string[] = []) {
    if (!questions) return;
    const pool = questions.filter((q) => matchesFilter(q, category, tags));
    if (pool.length === 0) return;

    const label = category && tags.length > 0 ? `${category} — ${tags.join(", ")}` : category;
    beginSession(pool, "infinite", "", label);

    // Fire-and-forget: powers the cheer message's attempt history. Not
    // awaited so quiz start stays instant; the cheer just appears a beat
    // after the first question renders once this resolves.
    fetchAttempts()
      .then((attempts) => setQuestionStats(computeQuestionStats(attempts)))
      .catch(() => {});
  }

  function startTypePlay(kind: QuestionKind) {
    if (!questions) return;
    const pool = questions.filter((q) => matchesKind(q, kind));
    if (pool.length === 0) return;

    beginSession(pool, "infinite", "", KIND_LABELS[kind]);

    fetchAttempts()
      .then((attempts) => setQuestionStats(computeQuestionStats(attempts)))
      .catch(() => {});
  }

  async function startReviewByType(kind: QuestionKind) {
    if (!questions) return;
    const pool = questions.filter((q) => matchesKind(q, kind));

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(pool, attempts, null);
      if (mostWrong.length === 0) {
        setNotice({ text: `No incorrect answers in ${KIND_LABELS[kind]} — nice work!`, tone: "info" });
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `${KIND_LABELS[kind]} — MOST WRONG`, null);
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
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

  async function startReviewByCategory(category: string, tags: string[] = []) {
    if (!questions) return;
    const pool = questions.filter((q) => matchesFilter(q, category, tags));
    const label = tags.length > 0 ? `${category} — ${tags.join(", ")}` : category;

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(pool, attempts, null);
      if (mostWrong.length === 0) {
        setNotice({ text: `No incorrect answers in ${label} — nice work!`, tone: "info" });
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `${label} — MOST WRONG`, label);
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
    }
  }

  async function startHistoryList(limit: HistoryLimit) {
    if (!questions) return;

    try {
      const attempts = await fetchAttempts();
      const entries: HistoryEntry[] = attempts
        .slice()
        .sort((a, b) => (a.attemptedAt < b.attemptedAt ? 1 : -1))
        .slice(0, limit)
        .flatMap((attempt) => {
          const question = questions.find((q) => q.id === attempt.questionId);
          return question ? [{ attempt, question }] : [];
        });

      if (entries.length === 0) {
        setNotice({ text: "No attempts yet — answer a few questions first!", tone: "info" });
        return;
      }

      setQuestionStats(computeQuestionStats(attempts));
      setHistoryEntries(entries);
      setNotice(null);
      setView("historyList");
    } catch (err) {
      setNotice({ text: getErrorMessage(err), tone: "error" });
    }
  }

  function selectHistoryEntry(entry: HistoryEntry) {
    setHistoryDetailEntry(entry);
    setView("historyDetail");
  }

  function backToHistoryList() {
    setView("historyList");
  }

  function backToMenu() {
    setView("menu");
    setMode(null);
    setFilterLabel(null);
    setSessionLabel("");
    setCurrent(null);
    setQuestionStats(null);
    setNotice(null);
    setHistoryEntries([]);
    setHistoryDetailEntry(null);
  }

  function goToCategoryPick() {
    setNotice(null);
    setView("categoryPick");
  }

  function goToTypePick() {
    setNotice(null);
    setView("typePick");
  }

  function goToHistoryPick() {
    setNotice(null);
    setView("historyPick");
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
      : mode && (filterLabel ? `${filterLabel} — ${MODE_LABELS[mode]}` : MODE_LABELS[mode]);

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
    historyEntries,
    historyDetailEntry,
    startPlay,
    startTypePlay,
    startReviewByRange,
    startReviewByCategory,
    startReviewByType,
    startNewByRange,
    startHistoryList,
    selectHistoryEntry,
    backToHistoryList,
    backToMenu,
    goToCategoryPick,
    goToTypePick,
    goToReviewPick,
    goToNewPick,
    goToHistoryPick,
    goToAnalytics,
    handleNext,
  };
}

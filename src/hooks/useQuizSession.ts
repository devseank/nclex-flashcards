"use client";

import { useState, useEffect, useRef } from "react";
import { Question } from "@/services/questions";
import {
  recordAttempt,
  fetchAttempts,
  computeQuestionStats,
  Attempt,
  QuestionStats,
} from "@/services/attempts";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek } from "@/lib/dateRanges";
import { QuestionFilter, EMPTY_FILTER, queryQuestions, describeFilter } from "@/lib/questionFilter";
import { SessionMode, isCorrect, selectMostWrong, selectUnattempted, selectLeastRecentlyTried } from "@/lib/quizLogic";
import { pickNextForReview } from "@/lib/srs";
import { ReviewRange } from "@/components/picker/ReviewMode";
import { NewRange } from "@/components/picker/NewMode";
import { HistoryLimit } from "@/components/picker/HistoryMode";
import { HistoryEntry } from "@/components/history/HistoryList";

export type View =
  | "menu"
  | "filterPick"
  | "reviewPick"
  | "newPick"
  | "historyPick"
  | "historyList"
  | "historyDetail"
  | "session"
  | "finished"
  | "analytics";

export type Notice = { text: string; tone: "info" | "error" };

// What each pushed browser-history entry represents -- just the view it was
// on, so popstate can restore it directly with setView (see the effects in
// useQuizSession below).
type NavHistoryState = { nclexView: View };

// Views restorable from history.state alone on a fresh mount -- each only
// needs `questions` to render correctly. "session"/"finished"/"historyList"/
// "historyDetail" also depend on companion state (current question, queue,
// historyEntries, ...) that's never written to history.state, only ever
// held in memory -- restoring just the view name for one of those would
// mean e.g. view="session" with mode/current still at their fresh-mount
// defaults, which every render branch below guards on (`mode && current`),
// so the screen would just render blank with no way back to menu. Safer to
// fall back to "menu" for those than restore a view the rest of the state
// can't actually support.
const RESTORABLE_VIEWS = new Set<View>(["menu", "filterPick", "reviewPick", "newPick", "historyPick", "analytics"]);

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
// screens (start a mode/filter/review, answer a question, return to menu).
// FlashcardApp just wires this up to the right screen components.
export function useQuizSession(questions: Question[] | null) {
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "menu";
    // Next.js's App Router remounts client components on back/forward (see
    // the mount effect below), so a fresh mount isn't necessarily a fresh
    // load -- read back whatever this history entry was tagged with, if
    // anything, instead of always defaulting to "menu". Only for views that
    // don't need restored companion state (see RESTORABLE_VIEWS above).
    const restored = (window.history.state as NavHistoryState | null)?.nclexView;
    return restored && RESTORABLE_VIEWS.has(restored) ? restored : "menu";
  });
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [questionStats, setQuestionStats] = useState<Map<number, QuestionStats> | null>(null);
  // Raw attempt history (not just the derived `questionStats` map above) --
  // feeds `pickNextForReview`'s spaced-repetition scheduling. Empty until
  // the first fetch resolves, which just means the picker treats everything
  // as "new" (equal weight, same as plain random) until then -- no special
  // casing needed for that gap.
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyDetailEntry, setHistoryDetailEntry] = useState<HistoryEntry | null>(null);

  // Makes the browser/hardware back button (and iOS/Android swipe-back)
  // navigate within the app instead of leaving the page entirely. Every
  // `view` change pushes a same-URL history entry tagged with that view;
  // going back pops to a previously-tagged entry and popstate restores it
  // with setView. isPoppingRef distinguishes "view changed because the user
  // (or code) navigated forward/sideways" (push a new entry) from "view
  // changed because popstate just told us to" (don't re-push, or every back
  // press would immediately cancel itself out with a fresh forward entry).
  const isPoppingRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  // The view this render's effect is transitioning FROM, so the push effect
  // below can tell "session started from a picker screen" (filterPick/
  // reviewPick/newPick) and "just finished a session" apart from any other
  // transition -- see the collapse logic there.
  const prevViewRef = useRef<View>(view);

  useEffect(() => {
    // Next.js's App Router keeps its own bookkeeping in `history.state`
    // (an internal RSC tree cache) and -- as observed directly -- fully
    // remounts client components like this one in response to popstate, as
    // part of restoring that cache. Its own replaceState call preserves
    // whatever was already in `history.state` (merging its fields in
    // alongside ours), so only seed "menu" if nothing has tagged this entry
    // yet, or if it's tagged with a view the lazy useState initializer above
    // just declined to restore (RESTORABLE_VIEWS) -- otherwise leave it
    // alone, since that initializer already read the correct, preserved
    // value for this render. Spreading the existing state (rather than
    // replacing it outright) keeps Next's own fields intact either way.
    const existing = window.history.state as NavHistoryState | null;
    if (!existing?.nclexView || !RESTORABLE_VIEWS.has(existing.nclexView)) {
      window.history.replaceState({ ...existing, nclexView: "menu" } satisfies NavHistoryState, "");
    }

    function handlePopState(e: PopStateEvent) {
      const targetView = (e.state as NavHistoryState | null)?.nclexView;
      // No tagged view means the user has gone back past every entry this
      // app ever pushed (e.g. onto whatever page linked here) -- nothing of
      // ours left to restore, so let the browser's own navigation proceed
      // rather than trapping the user inside the app.
      if (!targetView) return;
      isPoppingRef.current = true;
      setView(targetView);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevViewRef.current = view;
      return;
    }
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      prevViewRef.current = view;
      return;
    }

    // Entering "session" from a picker screen, or entering "finished"
    // (always from "session"), REPLACES the previous history entry instead
    // of pushing a new one -- collapsing the transient chooser/live-session
    // screen out of the back-stack so a single back press always lands on
    // "menu", the same target every removed "← MENU"-style button used to
    // jump straight to. Without this, back from a filter/review/new-started
    // session would land on the picker screen instead of menu (one hop
    // short), and back from "finished" would land on "session" with `current`
    // already nulled out (handleNext does that before this runs), which
    // every view === "session" render branch guards on -- so the screen
    // would just go blank with no way back, since there's no button here to
    // recover with.
    const prev = prevViewRef.current;
    const collapse =
      (view === "session" && (prev === "filterPick" || prev === "reviewPick" || prev === "newPick")) ||
      view === "finished";
    const entry = { ...window.history.state, nclexView: view } satisfies NavHistoryState;
    if (collapse) {
      window.history.replaceState(entry, "");
    } else {
      window.history.pushState(entry, "");
    }
    prevViewRef.current = view;
  }, [view]);

  function beginSession(pool: Question[], m: SessionMode, label: string, filter: string | null) {
    setMode(m);
    setFilterLabel(filter);
    setSessionLabel(label);
    setAnswers([]);
    setNotice(null);
    setView("session");

    if (m === "infinite") {
      setQueue(pool);
      setCurrent(pickNextForReview(pool, attempts));
    } else {
      setQueue(pool);
      setIndex(0);
      setCurrent(pool[0]);
    }
  }

  function startPlay(filter: QuestionFilter = EMPTY_FILTER) {
    if (!questions) return;
    const pool = queryQuestions(questions, filter);
    const label = describeFilter(filter);
    if (pool.length === 0) {
      // Multiple selected tags are an intersection (a question must have
      // ALL of them), so a combination that's individually valid per-facet
      // can still produce zero matches -- without this, PLAY just silently
      // did nothing.
      setNotice({ text: `No questions match ${label ?? "this filter"} — try a broader filter.`, tone: "info" });
      return;
    }
    beginSession(pool, "infinite", "", label);

    // Fire-and-forget: powers the cheer message's attempt history and the
    // SRS scheduling data for subsequent picks. Not awaited so quiz start
    // stays instant; the cheer (and SRS-aware picking) just kick in a beat
    // after the first question renders once this resolves.
    fetchAttempts()
      .then((fetched) => {
        setQuestionStats(computeQuestionStats(fetched));
        setAttempts(fetched);
      })
      .catch(() => {});
  }

  async function startReviewByFilter(filter: QuestionFilter) {
    if (!questions) return;
    const pool = queryQuestions(questions, filter);
    const label = describeFilter(filter);

    try {
      const attempts = await fetchAttempts();
      const mostWrong = selectMostWrong(pool, attempts, null);
      if (mostWrong.length === 0) {
        setNotice({ text: `No incorrect answers in ${label ?? "this filter"} — nice work!`, tone: "info" });
        return;
      }
      setQuestionStats(computeQuestionStats(attempts));
      beginSession(mostWrong, "review", `${label ?? "REVIEW"} — MOST WRONG`, label);
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

  function goToFilterPick() {
    setNotice(null);
    setView("filterPick");
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
    // Built locally (not read back from state) so the very next pick sees
    // this answer immediately -- React's state update wouldn't be visible
    // within this same function call otherwise.
    let updatedAttempts = attempts;

    if (current && selected.length > 0) {
      const wasCorrect = isCorrect(current, selected);
      recordAttempt(current.id, selected, wasCorrect).catch((err) =>
        console.error("Failed to record attempt:", err),
      );
      updatedAttempts = [
        ...attempts,
        { id: -1, questionId: current.id, selectedIndices: selected, isCorrect: wasCorrect, attemptedAt: new Date().toISOString() },
      ];
      setAttempts(updatedAttempts);
    }

    if (mode === "infinite") {
      setCurrent((prev) => pickNextForReview(queue, updatedAttempts, prev?.id));
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
    startReviewByFilter,
    startReviewByRange,
    startNewByRange,
    startHistoryList,
    selectHistoryEntry,
    goToFilterPick,
    goToReviewPick,
    goToNewPick,
    goToHistoryPick,
    goToAnalytics,
    handleNext,
  };
}

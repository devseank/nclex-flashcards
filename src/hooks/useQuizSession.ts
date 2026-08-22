"use client";

import { useState, useEffect, useRef } from "react";
import { Question, QuestionMeta, fetchQuestionsByIds } from "@/services/questions";
import {
  recordAttempt,
  fetchAttempts,
  computeQuestionStats,
  Attempt,
  QuestionStats,
} from "@/services/attempts";
import { fetchFavoriteIds, addFavorite, removeFavorite } from "@/services/favorites";
import { fetchNotesForQuestions, Note } from "@/services/notes";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek } from "@/lib/dateRanges";
import { QuestionFilter, EMPTY_FILTER, queryQuestions, describeFilter } from "@/lib/questionFilter";
import {
  SessionMode,
  QuestionResponse,
  isCorrect,
  isGridResponse,
  isBowtieResponse,
  isHotspotResponse,
  selectMostWrong,
  selectUnattempted,
  selectLeastRecentlyTried,
} from "@/lib/quizLogic";
import { pickNextForReview, pickBatch, WINDOW_SIZE, REFILL_THRESHOLD } from "@/lib/srs";
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
  | "favoritesList"
  | "favoritesDetail"
  | "notesList"
  | "notesDetail"
  | "session"
  | "finished"
  | "analytics";

export type Notice = { text: string; tone: "info" | "error" };

// What each pushed browser-history entry represents -- just the view it was
// on, so popstate can restore it directly with setView (see the effects in
// useQuizSession below).
type NavHistoryState = { nclexView: View };

// Views restorable from history.state alone on a fresh mount -- each only
// needs `meta` to render correctly. "session"/"finished"/"historyList"/
// "historyDetail" also depend on companion state (current question, queue,
// historyEntries, ...) that's never written to history.state, only ever
// held in memory -- restoring just the view name for one of those would
// mean e.g. view="session" with mode/current still at their fresh-mount
// defaults, which every render branch below guards on (`mode && current`),
// so the screen would just render blank with no way back to menu. Safer to
// fall back to "menu" for those than restore a view the rest of the state
// can't actually support.
const RESTORABLE_VIEWS = new Set<View>([
  "menu",
  "filterPick",
  "reviewPick",
  "newPick",
  "historyPick",
  "favoritesList",
  "notesList",
  "analytics",
]);

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
//
// `meta` is the lightweight pool (id/category/tags/type/correctIndices/
// createdAt/source only) fetched on mount -- full question bodies
// (question/rationale/choices/...) are fetched lazily, by id, only when a
// screen is actually about to show that question's text, via the `hydrate`
// cache below. This is what removes the multi-second "fetch every
// question's full body up front" mount cost.
export function useQuizSession(meta: QuestionMeta[] | null) {
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
  // The QuestionMeta[] pool backing the active infinite-mode session --
  // pickNextForReview/pickBatch's pool argument. Bounded modes (review/new)
  // don't need this after beginSession hydrates their whole (bounded) pool
  // into `queue` up front.
  const [metaPool, setMetaPool] = useState<QuestionMeta[]>([]);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  // Infinite mode only: a small lookahead window of already-hydrated
  // Questions sitting ahead of `current`, FIFO -- so answering a question
  // doesn't wait on a network round trip for the next one. Refilled in the
  // background before it runs dry (see maybeRefill below). Never populated
  // for bounded modes (review/new), which hydrate their whole pool up front
  // instead.
  const [upcoming, setUpcoming] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<QuestionResponse[]>([]);
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
  // Starred question ids -- persistent cross-session state (like theme/font),
  // not per-session transient state, so goToMenu() never resets this. Loaded
  // once on mount rather than per-flow like `attempts`: it needs to be known
  // as soon as ANY question renders (the star button), not just within a
  // specific "start a session" flow.
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoritesDetailQuestion, setFavoritesDetailQuestion] = useState<Question | null>(null);
  // Hydrated full bodies for every starred question, refreshed whenever
  // goToFavoritesList is called -- bounded by however many the user has
  // starred, so an eager hydrate on every visit is cheap.
  const [favoritesQuestions, setFavoritesQuestions] = useState<Question[]>([]);
  // Which question's note is open on the dedicated notes detail page --
  // NotesList/NotesDetail otherwise manage all their own state (pagination,
  // edit mode, autosave) independently of this hook, the same way
  // Analytics.tsx self-manages its own fetch; this is the one piece that's
  // genuinely cross-cutting (both NOTES.EXE's list and the "+ NOTE"/edit
  // affordance under any revealed answer navigate to the same place).
  const [notesDetailQuestionId, setNotesDetailQuestionId] = useState<number | null>(null);
  // Per-question note lookup for the read-only preview shown under a
  // revealed answer (SessionScreen/HistoryDetail/FavoritesDetail/
  // FinishedScreen) -- only ever grows via hydrateNotes below, and only
  // contains questions that actually have a Note (create-on-demand model,
  // same as favoriteIds is a Set of only the starred ones).
  const [notesByQuestionId, setNotesByQuestionId] = useState<Map<number, Note>>(new Map());

  // Every full Question body ever fetched, keyed by id -- shared across
  // every hydrate() call for the lifetime of this hook instance, so
  // re-showing a question (e.g. it resurfaces in PLAY, or REVIEW overlaps
  // with something already seen) never re-fetches it.
  const cacheRef = useRef(new Map<number, Question>());
  // `null` entries mean "checked, this question has no note" -- see
  // hydrateNotes below.
  const noteCacheRef = useRef(new Map<number, Note | null>());
  // Bumped on every infinite-mode "pick" (the empty-window fallback fetch in
  // handleNext, and each background refill) -- an async op captures the
  // value at call time and only applies its result if it's still current
  // when the fetch resolves, so a slow stale fetch can't clobber newer
  // current/upcoming state if the user answers unusually fast.
  const ticketRef = useRef(0);
  // Single-flight guard for maybeRefill -- an overlapping refill request
  // just skips (the next handleNext call retries via the empty-window
  // fallback, or a later maybeRefill call once this one finishes).
  const isRefillingRef = useRef(false);

  // Looks up the cache for each id, fetches only the misses in one request,
  // merges the results in, and returns every requested id's Question in the
  // order given.
  function hydrate(ids: number[]): Promise<Question[]> {
    const cache = cacheRef.current;
    const missingIds = ids.filter((id) => !cache.has(id));
    const fetchMissing = missingIds.length > 0 ? fetchQuestionsByIds(missingIds) : Promise.resolve([]);
    return fetchMissing.then((fetched) => {
      for (const q of fetched) cache.set(q.id, q);
      return ids.map((id) => cache.get(id)!);
    });
  }

  // Same cache-then-fetch-misses shape as hydrate() above, but for notes --
  // `null` cached means "checked, this question has no note." Only ids that
  // actually resolve to a Note get merged into `notesByQuestionId` state (a
  // Map of existing notes only, not a full id->note-or-null table), so
  // NotePreview's callers can tell "has a note" apart from "not checked yet"
  // with a plain `.get(id)`.
  function hydrateNotes(questionIds: number[]): Promise<void> {
    const cache = noteCacheRef.current;
    const missingIds = questionIds.filter((id) => !cache.has(id));
    const fetchMissing = missingIds.length > 0 ? fetchNotesForQuestions(missingIds) : Promise.resolve([]);
    return fetchMissing.then((fetched) => {
      const fetchedByQuestionId = new Map(fetched.map((n) => [n.questionId, n]));
      for (const id of missingIds) {
        cache.set(id, fetchedByQuestionId.get(id) ?? null);
      }
      setNotesByQuestionId((prev) => {
        const next = new Map(prev);
        for (const id of questionIds) {
          const cached = cache.get(id);
          if (cached) next.set(id, cached);
        }
        return next;
      });
    });
  }

  useEffect(() => {
    fetchFavoriteIds()
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch((err) => console.error("Failed to fetch favorites:", err));
  }, []);

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
    //
    // Entering "menu" (only ever via the header bar's Home icon, goToMenu)
    // collapses too, and unconditionally: goToMenu clears essentially every
    // bit of companion state (current, historyEntries, historyDetailEntry,
    // ...), so leaving its origin screen's entry in the stack would hit the
    // exact same class of blank-screen bug on back -- e.g. back from menu
    // landing on "historyDetail" with historyDetailEntry already nulled out.
    const prev = prevViewRef.current;
    const collapse =
      (view === "session" && (prev === "filterPick" || prev === "reviewPick" || prev === "newPick" || prev === "favoritesList")) ||
      view === "finished" ||
      view === "menu";
    const entry = { ...window.history.state, nclexView: view } satisfies NavHistoryState;
    if (collapse) {
      window.history.replaceState(entry, "");
    } else {
      window.history.pushState(entry, "");
    }
    prevViewRef.current = view;
  }, [view]);

  function beginSession(pool: QuestionMeta[], m: SessionMode, label: string, filter: string | null) {
    const ticket = ++ticketRef.current;
    setMode(m);
    setFilterLabel(filter);
    setSessionLabel(label);
    setAnswers([]);
    setNotice(null);
    setCurrent(null);
    setMetaPool(pool);
    setView("session");

    if (m === "infinite") {
      setQueue([]);
      setIndex(0);
      setUpcoming([]);
      const picks = pickBatch(pool, attempts, new Set(), WINDOW_SIZE);
      hydrate(picks.map((q) => q.id)).then((hydrated) => {
        if (ticketRef.current !== ticket) return;
        setCurrent(hydrated[0] ?? null);
        setUpcoming(hydrated.slice(1));
        hydrateNotes(hydrated.map((q) => q.id)).catch((err) => console.error("Failed to load notes:", err));
      });
    } else {
      setIndex(0);
      hydrate(pool.map((q) => q.id)).then((hydrated) => {
        if (ticketRef.current !== ticket) return;
        setQueue(hydrated);
        setCurrent(hydrated[0] ?? null);
        hydrateNotes(hydrated.map((q) => q.id)).catch((err) => console.error("Failed to load notes:", err));
      });
    }
  }

  function startPlay(filter: QuestionFilter = EMPTY_FILTER) {
    if (!meta) return;
    const pool = queryQuestions(meta, filter);
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

  // Optimistically flips local state first, then fires the actual
  // add/remove request in the background -- same optimistic-then-fire-and-
  // forget shape handleNext already uses for recordAttempt below.
  function toggleFavorite(questionId: number) {
    const wasFavorited = favoriteIds.has(questionId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    const request = wasFavorited ? removeFavorite(questionId) : addFavorite(questionId);
    request.catch((err) => console.error("Failed to update favorite:", err));
  }

  // Mirrors startPlay (infinite, spaced-repetition loop) rather than
  // startReviewByRange/startNewByRange (a fixed quiz reaching "finished") --
  // FAVORITES is framed as "play from it," the same direct-start
  // interaction as PLAY itself, just pre-filtered to the starred pool.
  function startFavorites() {
    if (!meta) return;
    const pool = meta.filter((q) => favoriteIds.has(q.id));
    if (pool.length === 0) {
      setNotice({ text: "No favorites yet — tap the star on a question to add one.", tone: "info" });
      return;
    }
    beginSession(pool, "infinite", "", "FAVORITES");

    fetchAttempts()
      .then((fetched) => {
        setQuestionStats(computeQuestionStats(fetched));
        setAttempts(fetched);
      })
      .catch(() => {});
  }

  async function startReviewByFilter(filter: QuestionFilter) {
    if (!meta) return;
    const pool = queryQuestions(meta, filter);
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
    if (!meta) return;

    try {
      const attempts = await fetchAttempts();

      if (range === "stale") {
        const leastRecentlyTried = selectLeastRecentlyTried(meta, attempts);
        if (leastRecentlyTried.length === 0) {
          setNotice({ text: "No attempted questions yet — answer a few first!", tone: "info" });
          return;
        }
        setQuestionStats(computeQuestionStats(attempts));
        beginSession(leastRecentlyTried, "review", `REVIEW — ${REVIEW_RANGE_LABELS[range]}`, null);
        return;
      }

      const since = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : null;
      const mostWrong = selectMostWrong(meta, attempts, since);
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
    if (!meta) return;
    const since = range === "today" ? startOfToday() : range === "week" ? startOfWeek() : null;

    try {
      const attempts = await fetchAttempts();
      const unattempted = selectUnattempted(meta, attempts, since);
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
    if (!meta) return;

    try {
      const attempts = await fetchAttempts();
      const sliced = attempts
        .slice()
        .sort((a, b) => (a.attemptedAt < b.attemptedAt ? 1 : -1))
        .slice(0, limit);

      const uniqueIds = [...new Set(sliced.map((a) => a.questionId))];
      const hydrated = await hydrate(uniqueIds);
      const questionById = new Map(hydrated.map((q) => [q.id, q]));
      const entries: HistoryEntry[] = sliced.flatMap((attempt) => {
        const question = questionById.get(attempt.questionId);
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
    hydrateNotes([entry.question.id]).catch((err) => console.error("Failed to load notes:", err));
  }

  // Explicit "jump straight home" action for the header bar's Home icon --
  // deliberately resets every bit of in-progress session/notice/history
  // state, unlike browser/hardware back (which only restores `view` itself;
  // see the push effect above). A stale `notice` or `historyEntries` would
  // otherwise leak into whatever's opened next.
  function goToMenu() {
    setView("menu");
    setMode(null);
    setFilterLabel(null);
    setSessionLabel("");
    setCurrent(null);
    setQuestionStats(null);
    setNotice(null);
    setHistoryEntries([]);
    setHistoryDetailEntry(null);
    setFavoritesDetailQuestion(null);
    setNotesDetailQuestionId(null);
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

  function goToFavoritesList() {
    setNotice(null);
    setView("favoritesList");
    hydrate([...favoriteIds])
      .then((hydrated) => {
        setFavoritesQuestions(hydrated);
        hydrateNotes(hydrated.map((q) => q.id)).catch((err) => console.error("Failed to load notes:", err));
      })
      .catch((err) => console.error("Failed to load favorites:", err));
  }

  function selectFavorite(question: Question) {
    setFavoritesDetailQuestion(question);
    setView("favoritesDetail");
    hydrateNotes([question.id]).catch((err) => console.error("Failed to load notes:", err));
  }

  function goToAnalytics() {
    setView("analytics");
  }

  function goToNotesList() {
    setNotice(null);
    setView("notesList");
  }

  function goToNotesDetail(questionId: number) {
    setNotesDetailQuestionId(questionId);
    setView("notesDetail");
  }

  // Tops the lookahead window back up to WINDOW_SIZE once it's run low,
  // in the background -- `upcomingList`/`currentId` are the just-updated
  // values (not yet reflected in the `upcoming`/`current` state variables at
  // the point handleNext calls this), so the exclude set stays accurate
  // regardless of React's batching. Guarded by isRefillingRef (no more than
  // one refill in flight) and ticketRef (a slow refill whose ticket has
  // since been superseded by a newer pick just drops its result instead of
  // clobbering newer state).
  function maybeRefill(upcomingList: Question[], currentId: number, attemptsForWeighting: Attempt[]) {
    if (upcomingList.length > REFILL_THRESHOLD || isRefillingRef.current) return;
    isRefillingRef.current = true;
    const ticket = ++ticketRef.current;
    const exclude = new Set([currentId, ...upcomingList.map((q) => q.id)]);
    const picks = pickBatch(metaPool, attemptsForWeighting, exclude, WINDOW_SIZE - upcomingList.length);
    hydrate(picks.map((q) => q.id))
      .then((hydrated) => {
        if (ticketRef.current === ticket) {
          setUpcoming((prev) => [...prev, ...hydrated]);
          hydrateNotes(hydrated.map((q) => q.id)).catch((err) => console.error("Failed to load notes:", err));
        }
      })
      .finally(() => {
        isRefillingRef.current = false;
      });
  }

  function handleNext(selected: QuestionResponse) {
    // Built locally (not read back from state) so the very next pick sees
    // this answer immediately -- React's state update wouldn't be visible
    // within this same function call otherwise.
    let updatedAttempts = attempts;

    // Bowtie/hot-spot's response is a plain object, not an array --
    // BowtieFlashcard/HotspotFlashcard only ever call onNext once fully
    // answered, so unlike the array types (where an empty array means
    // "nothing picked yet"), a response reaching here in object form is
    // always already complete.
    const hasResponse = Array.isArray(selected) ? selected.length > 0 : true;

    if (current && hasResponse) {
      const wasCorrect = isCorrect(current, selected);
      recordAttempt(current.id, selected, wasCorrect).catch((err) =>
        console.error("Failed to record attempt:", err),
      );
      // A grid response (number[][]) has no flat selectedIndices of its own,
      // and neither does bowtie/hot-spot (both plain objects) -- mirrors how
      // recordAttempt/the DB split all three above, so the locally-built
      // optimistic Attempt matches what fetchAttempts would return.
      const grid = isGridResponse(selected);
      const bowtie = isBowtieResponse(selected) ? selected : undefined;
      const hotspot = isHotspotResponse(selected) ? selected : undefined;
      updatedAttempts = [
        ...attempts,
        {
          id: -1,
          questionId: current.id,
          selectedIndices: grid || bowtie || hotspot ? [] : (selected as number[]),
          gridSelections: grid ? (selected as number[][]) : undefined,
          bowtieResponse: bowtie,
          hotspotResponse: hotspot,
          isCorrect: wasCorrect,
          attemptedAt: new Date().toISOString(),
        },
      ];
      setAttempts(updatedAttempts);
    }

    if (mode === "infinite") {
      if (upcoming.length > 0) {
        const [next, ...rest] = upcoming;
        setCurrent(next);
        setUpcoming(rest);
        maybeRefill(rest, next.id, updatedAttempts);
      } else {
        // Window hasn't caught up (e.g. very fast repeated answers) -- fall
        // back to a single pick + fetch rather than blocking on nothing.
        const ticket = ++ticketRef.current;
        const pick = pickNextForReview(metaPool, updatedAttempts, current?.id);
        hydrate([pick.id]).then(([hydrated]) => {
          if (ticketRef.current !== ticket) return;
          setCurrent(hydrated);
          hydrateNotes([hydrated.id]).catch((err) => console.error("Failed to load notes:", err));
          maybeRefill([], hydrated.id, updatedAttempts);
        });
      }
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
    favoriteIds,
    favoritesDetailQuestion,
    favoritesQuestions,
    notesDetailQuestionId,
    notesByQuestionId,
    toggleFavorite,
    startPlay,
    startFavorites,
    startReviewByFilter,
    startReviewByRange,
    startNewByRange,
    startHistoryList,
    selectHistoryEntry,
    selectFavorite,
    goToMenu,
    goToFilterPick,
    goToReviewPick,
    goToNewPick,
    goToHistoryPick,
    goToFavoritesList,
    goToAnalytics,
    goToNotesList,
    goToNotesDetail,
    handleNext,
  };
}

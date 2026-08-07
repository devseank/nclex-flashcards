// `import type` (not a value import) so this stays a pure, dependency-free
// module at runtime -- see the identical note in src/lib/srs.ts. This used
// to also value-import computeQuestionStats from @/services/attempts,
// which pulled the Supabase client (and its Realtime/WebSocket setup) in
// transitively -- broke the very first attempt at a quizLogic.test.ts,
// which is why that function now lives here instead (re-exported from
// @/services/attempts for existing import sites).
import type { Question } from "@/services/questions";
import type { Attempt } from "@/services/attempts";

export type SessionMode = "infinite" | "review" | "new";

export type QuestionStats = {
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  lastAttemptedAt: string;
};

export function computeQuestionStats(attempts: Attempt[]): Map<number, QuestionStats> {
  const map = new Map<number, QuestionStats>();
  for (const a of attempts) {
    const s: QuestionStats = map.get(a.questionId) ?? {
      totalAttempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastAttemptedAt: a.attemptedAt,
    };
    s.totalAttempts += 1;
    if (a.isCorrect) s.correctCount += 1;
    else s.incorrectCount += 1;
    if (a.attemptedAt > s.lastAttemptedAt) s.lastAttemptedAt = a.attemptedAt;
    map.set(a.questionId, s);
  }
  return map;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom(pool: Question[], excludeId?: number): Question {
  const filtered = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export type BowtieResponse = { condition: number; actions: number[]; monitor: number[] };

// Every type's response fits one of these shapes -- a plain number[]
// (choice/sequence/cloze: a set of indices, a permutation, one index per
// blank), grid's number[][] (one array of selected column indices per row,
// since a row can have more than one correct column), or bowtie's 3-part
// object (its sections are independent, not a flat list). Extend this
// union, not the shape of an existing member, as future types add their
// own natural response shape (see the NGN roadmap plan).
export type QuestionResponse = number[] | number[][] | BowtieResponse;

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export function isCorrect(question: Question, response: QuestionResponse): boolean {
  if (question.type === "sequence") {
    const r = response as number[];
    return (
      r.length === question.correctOrder.length &&
      r.every((choiceIndex, position) => choiceIndex === question.correctOrder[position])
    );
  }
  if (question.type === "grid") {
    // response[row] is the *set* of column indices selected for that row --
    // compared as a set (order picked doesn't matter), not positionally
    // like sequence above. Single-select is just the every-set-length-1
    // case.
    const r = response as number[][];
    return r.length === question.gridAnswers.length && r.every((sel, row) => sameSet(sel, question.gridAnswers[row]));
  }
  if (question.type === "cloze") {
    // response[i] is the option index picked for blank i -- positional
    // like sequence above, not a set: each blank's correctness is scoped
    // to that blank alone, never compared across blanks.
    const r = response as number[];
    return (
      r.length === question.clozeBlanks.length &&
      r.every((optionIndex, blank) => optionIndex === question.clozeBlanks[blank].correctIndex)
    );
  }
  if (question.type === "bowtie") {
    // condition is a single exact pick; actions/monitor each compare as a
    // set (order picked doesn't matter), independently of one another --
    // there's no cross-section comparison, each of the 3 is scored on its
    // own terms.
    const r = response as BowtieResponse;
    return (
      r.condition === question.condition.answer &&
      sameSet(r.actions, question.actions.answer) &&
      sameSet(r.monitor, question.monitor.answer)
    );
  }
  const r = response as number[];
  return (
    r.length === question.correctIndices.length &&
    r.every((i) => question.correctIndices.includes(i))
  );
}

export function selectMostWrong(
  pool: Question[],
  attempts: Attempt[],
  since: Date | null,
): Question[] {
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

// Questions with zero attempts, optionally restricted to ones added since a
// given date, newest addition first. Backs the NEW/NEWER/NEWEST picker for
// practicing freshly-imported questions before anything else touches them.
export function selectUnattempted(pool: Question[], attempts: Attempt[], since: Date | null): Question[] {
  const attemptedIds = new Set(attempts.map((a) => a.questionId));
  return pool
    .filter((q) => !attemptedIds.has(q.id))
    .filter((q) => !since || new Date(q.createdAt) >= since)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Questions with at least one attempt, sorted so the one it's been longest
// since attempting comes first -- a simple staleness/spaced-repetition queue.
export function selectLeastRecentlyTried(pool: Question[], attempts: Attempt[]): Question[] {
  const stats = computeQuestionStats(attempts);
  return pool
    .filter((q) => stats.has(q.id))
    .sort((a, b) => new Date(stats.get(a.id)!.lastAttemptedAt).getTime() - new Date(stats.get(b.id)!.lastAttemptedAt).getTime());
}

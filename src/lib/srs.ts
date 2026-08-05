// `import type` (not a value import) so this stays a pure, dependency-free
// module at runtime -- `@/services/questions`/`@/services/attempts` pull in
// the Supabase client, which throws at import time without env vars set.
// That would make this file (and anything testing it) accidentally depend
// on Supabase configuration for no real reason, since only the types are
// used here.
import type { Question } from "@/services/questions";
import type { Attempt } from "@/services/attempts";

const HOUR_MS = 60 * 60 * 1000;

// Deliberately not imported from `@/lib/quizLogic` (which has the identical
// helper) -- quizLogic.ts has a real value-level import of
// `@/services/attempts` for `computeQuestionStats`, which would pull the
// Supabase client (and its Realtime/WebSocket setup) into this otherwise
// dependency-free module transitively, breaking under plain Node (e.g. in
// tests) for reasons that have nothing to do with this file's own logic.
function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Box 0 = due immediately (never correct yet, or just reset). Each
// successive box waits longer. Correct bumps up a box (capped at the last
// one); incorrect drops back to box 0 -- so a struggling question is
// already back at "immediately due" the moment it's missed, no separate
// low-score signal needed on top of due-date. Hours, not days, so this
// stays precise even within one rapid-fire session (a "day" boundary never
// meaningfully elapses in a single sitting).
// Exported (alongside the other tuning constants below) so tests can assert
// against the real values instead of hardcoding copies that could silently
// drift out of sync with the implementation.
export const BOX_INTERVAL_HOURS = [0, 24, 72, 168, 336, 720]; // 0h/1d/3d/7d/14d/30d
const MAX_BOX = BOX_INTERVAL_HOURS.length - 1;

// Escape valve: force-pick anything overdue past this, guaranteeing a hard
// worst-case bound independent of pool size (it depends only on this one
// question's own overdue-ness, never on how many other questions are
// competing for the draw) -- see the plan doc for the worked-out table.
// Pure weighted-random alone only gives good odds, not a guarantee, which
// isn't strong enough on its own.
const ESCAPE_GRACE_MIN_HOURS = 24;
export function escapeThresholdHours(box: number): number {
  return Math.max(ESCAPE_GRACE_MIN_HOURS, 2 * BOX_INTERVAL_HOURS[box]);
}

// Tunable weights -- no "correct" values, just need to feel right in
// practice.
export const NEW_QUESTION_WEIGHT = 4; // ~= a freshly-due review, so new
// content and due reviews compete roughly evenly rather than one drowning
// out the other.
export const DUE_BASE_WEIGHT = 5;
const OVERDUE_WEIGHT_PER_HOUR = 1 / 24; // +1 per day overdue
export const MAX_OVERDUE_BONUS = 10;
// Never reaches zero, however far out the due date is, so nothing is ever
// permanently unreachable by chance alone -- the escape valve above is the
// backstop for when chance isn't enough.
export const MIN_NOT_YET_DUE_WEIGHT = 0.1;
const NOT_YET_DUE_NUMERATOR_HOURS = 48;
const NOT_YET_DUE_OFFSET_HOURS = 24;

export type QuestionSchedule = { box: number; nextDueAt: Date };

// Replays each question's attempts (oldest first) through the box state
// machine to derive its current box + next-due date. Pure function of
// `attempts` -- the attempts log already IS the source of truth, so there's
// no separate schedule table to keep in sync.
export function computeSchedules(attempts: Attempt[]): Map<number, QuestionSchedule> {
  const byQuestion = new Map<number, Attempt[]>();
  for (const a of attempts) {
    const list = byQuestion.get(a.questionId);
    if (list) list.push(a);
    else byQuestion.set(a.questionId, [a]);
  }

  const schedules = new Map<number, QuestionSchedule>();
  for (const [questionId, qAttempts] of byQuestion) {
    const sorted = [...qAttempts].sort((a, b) => (a.attemptedAt < b.attemptedAt ? -1 : 1));
    let box = 0;
    for (const a of sorted) {
      box = a.isCorrect ? Math.min(box + 1, MAX_BOX) : 0;
    }
    const lastAttemptedAt = sorted[sorted.length - 1].attemptedAt;
    const nextDueAt = new Date(new Date(lastAttemptedAt).getTime() + BOX_INTERVAL_HOURS[box] * HOUR_MS);
    schedules.set(questionId, { box, nextDueAt });
  }
  return schedules;
}

// Exported for direct/deterministic testing of the escape-valve guarantee,
// rather than only being exercisable indirectly through pickNextForReview's
// randomness.
export function isCriticallyOverdue(schedule: QuestionSchedule | undefined, now: number): boolean {
  if (!schedule) return false;
  const hoursOverdue = (now - schedule.nextDueAt.getTime()) / HOUR_MS;
  return hoursOverdue > escapeThresholdHours(schedule.box);
}

// Exported for direct/deterministic testing of the weighting formula,
// rather than only being exercisable indirectly through pickNextForReview's
// randomness.
export function weightFor(schedule: QuestionSchedule | undefined, now: number): number {
  if (!schedule) return NEW_QUESTION_WEIGHT;

  const hoursUntilDue = (schedule.nextDueAt.getTime() - now) / HOUR_MS;
  if (hoursUntilDue <= 0) {
    return DUE_BASE_WEIGHT + Math.min(-hoursUntilDue * OVERDUE_WEIGHT_PER_HOUR, MAX_OVERDUE_BONUS);
  }
  return Math.max(MIN_NOT_YET_DUE_WEIGHT, NOT_YET_DUE_NUMERATOR_HOURS / (NOT_YET_DUE_OFFSET_HOURS + hoursUntilDue));
}

// Picks the next question for infinite PLAY, recomputed fresh every call
// (no queue, no stored state):
// 1. Anything critically overdue (past its escape threshold) is
//    force-picked (randomly among just those, if more than one) -- the
//    hard guarantee.
// 2. Otherwise, every candidate gets a weight (never-attempted ->
//    NEW_QUESTION_WEIGHT; due/overdue -> a base weight plus a bonus that
//    grows with how overdue it is; not-yet-due -> a small but never-zero
//    weight that decays the further out its due date is), and one is
//    chosen via weighted-random selection.
export function pickNextForReview(pool: Question[], attempts: Attempt[], excludeId?: number): Question {
  const candidates = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  if (candidates.length === 0) return pool[0];

  const schedules = computeSchedules(attempts);
  const now = Date.now();

  const criticallyOverdue = candidates.filter((q) => isCriticallyOverdue(schedules.get(q.id), now));
  if (criticallyOverdue.length > 0) return pickRandom(criticallyOverdue);

  const weights = candidates.map((q) => weightFor(schedules.get(q.id), now));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

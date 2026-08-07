import { describe, it, expect } from "vitest";
import type { Question } from "@/services/questions";
import type { Attempt } from "@/services/attempts";
import {
  computeSchedules,
  pickNextForReview,
  weightFor,
  isCriticallyOverdue,
  escapeThresholdHours,
  BOX_INTERVAL_HOURS,
  NEW_QUESTION_WEIGHT,
  DUE_BASE_WEIGHT,
  MAX_OVERDUE_BONUS,
  MIN_NOT_YET_DUE_WEIGHT,
} from "@/lib/srs";

const HOUR_MS = 60 * 60 * 1000;
const now = new Date("2026-01-15T12:00:00.000Z").getTime();

function hoursAgo(h: number): string {
  return new Date(now - h * HOUR_MS).toISOString();
}

function mockAttempt(questionId: number, isCorrect: boolean, attemptedAt: string): Attempt {
  return { id: Math.random(), questionId, selectedIndices: [0], isCorrect, attemptedAt };
}

function mockQuestion(id: number): Question {
  return {
    id,
    category: "Fundamentals",
    tags: [],
    question: `Question ${id}`,
    choices: ["A", "B"],
    rationale: "Because.",
    createdAt: hoursAgo(1000),
    source: "test",
    type: "choice",
    correctIndices: [0],
  };
}

describe("computeSchedules", () => {
  it("leaves a never-attempted question with no schedule", () => {
    const schedules = computeSchedules([]);
    expect(schedules.has(1)).toBe(false);
  });

  it("puts a single correct attempt at box 1, due 24h later", () => {
    const attempts = [mockAttempt(1, true, hoursAgo(10))];
    const schedule = computeSchedules(attempts).get(1)!;
    expect(schedule.box).toBe(1);
    expect(schedule.nextDueAt.getTime()).toBe(new Date(hoursAgo(10)).getTime() + BOX_INTERVAL_HOURS[1] * HOUR_MS);
  });

  it("bumps up a box per consecutive correct answer", () => {
    const attempts = [
      mockAttempt(1, true, hoursAgo(300)),
      mockAttempt(1, true, hoursAgo(200)),
      mockAttempt(1, true, hoursAgo(100)),
    ];
    expect(computeSchedules(attempts).get(1)!.box).toBe(3);
  });

  it("resets to box 0 on the most recent incorrect answer, regardless of earlier streak", () => {
    const attempts = [
      mockAttempt(1, true, hoursAgo(300)),
      mockAttempt(1, true, hoursAgo(200)),
      mockAttempt(1, false, hoursAgo(10)),
    ];
    const schedule = computeSchedules(attempts).get(1)!;
    expect(schedule.box).toBe(0);
    // box 0's interval is 0h -- due immediately at the moment it was missed.
    expect(schedule.nextDueAt.getTime()).toBe(new Date(hoursAgo(10)).getTime());
  });

  it("caps the box at the last rung of the ladder even with a long correct streak", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => mockAttempt(1, true, hoursAgo(1000 - i * 10)));
    expect(computeSchedules(attempts).get(1)!.box).toBe(BOX_INTERVAL_HOURS.length - 1);
  });

  it("tracks multiple questions independently", () => {
    const attempts = [mockAttempt(1, true, hoursAgo(10)), mockAttempt(2, false, hoursAgo(5))];
    const schedules = computeSchedules(attempts);
    expect(schedules.get(1)!.box).toBe(1);
    expect(schedules.get(2)!.box).toBe(0);
  });

  it("sorts out-of-order attempts by timestamp before replaying, not by array order", () => {
    // Passed newest-first -- if the replay didn't sort first, it would
    // process the incorrect one last and wrongly end on box 0.
    const attempts = [mockAttempt(1, false, hoursAgo(5)), mockAttempt(1, true, hoursAgo(10))];
    expect(computeSchedules(attempts).get(1)!.box).toBe(0);
  });
});

describe("weightFor", () => {
  it("gives a never-attempted question the fixed NEW_QUESTION_WEIGHT", () => {
    expect(weightFor(undefined, now)).toBe(NEW_QUESTION_WEIGHT);
  });

  it("gives a freshly-due question exactly DUE_BASE_WEIGHT", () => {
    const schedule = { box: 1, nextDueAt: new Date(now) };
    expect(weightFor(schedule, now)).toBe(DUE_BASE_WEIGHT);
  });

  it("increases weight the more overdue a question is, capped at MAX_OVERDUE_BONUS", () => {
    const barelyOverdue = weightFor({ box: 1, nextDueAt: new Date(now - 1 * HOUR_MS) }, now);
    const veryOverdue = weightFor({ box: 1, nextDueAt: new Date(now - 500 * HOUR_MS) }, now);
    expect(veryOverdue).toBeGreaterThan(barelyOverdue);
    expect(veryOverdue).toBe(DUE_BASE_WEIGHT + MAX_OVERDUE_BONUS);
  });

  it("never-attempted and freshly-due weights are the same order of magnitude (neither starves nor dominates)", () => {
    const freshlyDue = weightFor({ box: 1, nextDueAt: new Date(now) }, now);
    const ratio = NEW_QUESTION_WEIGHT / freshlyDue;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(3);
  });

  it("gives a not-yet-due question a small but strictly positive weight", () => {
    const farOut = weightFor({ box: 5, nextDueAt: new Date(now + 30 * 24 * HOUR_MS) }, now);
    expect(farOut).toBeGreaterThan(0);
    expect(farOut).toBeGreaterThanOrEqual(MIN_NOT_YET_DUE_WEIGHT);
    expect(farOut).toBeLessThan(DUE_BASE_WEIGHT);
  });

  it("decreases monotonically the further out the due date is (never reaching zero)", () => {
    const w1 = weightFor({ box: 5, nextDueAt: new Date(now + 1 * HOUR_MS) }, now);
    const w10 = weightFor({ box: 5, nextDueAt: new Date(now + 10 * HOUR_MS) }, now);
    const w100 = weightFor({ box: 5, nextDueAt: new Date(now + 100 * HOUR_MS) }, now);
    const w1000 = weightFor({ box: 5, nextDueAt: new Date(now + 1000 * HOUR_MS) }, now);
    expect(w1).toBeGreaterThan(w10);
    expect(w10).toBeGreaterThan(w100);
    expect(w100).toBeGreaterThan(w1000);
    expect(w1000).toBeGreaterThan(0);
  });
});

describe("isCriticallyOverdue / escapeThresholdHours (the hard starve-bound guarantee)", () => {
  it("a never-attempted question is never critically overdue (it has its own weight tier, not an overdue one)", () => {
    expect(isCriticallyOverdue(undefined, now)).toBe(false);
  });

  it("is not critically overdue before its escape threshold", () => {
    const box = 1; // 24h interval, 48h escape threshold
    const schedule = { box, nextDueAt: new Date(now - 47 * HOUR_MS) };
    expect(isCriticallyOverdue(schedule, now)).toBe(false);
  });

  it("becomes critically overdue once past its escape threshold", () => {
    const box = 1;
    const schedule = { box, nextDueAt: new Date(now - 49 * HOUR_MS) };
    expect(isCriticallyOverdue(schedule, now)).toBe(true);
  });

  it.each([
    [0, 24],
    [1, 48],
    [2, 144],
    [3, 336],
    [4, 672],
    [5, 1440],
  ])("box %i has an escape threshold of %i hours (the worst-case-bound table in the plan)", (box, expectedHours) => {
    expect(escapeThresholdHours(box)).toBe(expectedHours);
  });
});

describe("pickNextForReview", () => {
  it("never returns the excluded question, even from a small pool", () => {
    const pool = [mockQuestion(1), mockQuestion(2)];
    for (let i = 0; i < 20; i++) {
      expect(pickNextForReview(pool, [], 1).id).toBe(2);
    }
  });

  it("falls back to the only question in a 1-item pool rather than crashing", () => {
    const pool = [mockQuestion(1)];
    expect(pickNextForReview(pool, [], 1).id).toBe(1);
  });

  it("force-picks the one critically-overdue question no matter how many high-weight competitors exist", () => {
    // 999 never-attempted competitors (NEW_QUESTION_WEIGHT each) plus one
    // question critically overdue -- without the escape valve this would be
    // an astronomically unlikely weighted-random pick (see the plan's
    // worked-out odds), but the escape valve makes it deterministic.
    const overdueId = 1000;
    const pool = [mockQuestion(overdueId), ...Array.from({ length: 999 }, (_, i) => mockQuestion(i))];
    const attempts = [mockAttempt(overdueId, true, hoursAgo(24 + 49))]; // box 1, 49h past its 24h-later due date

    for (let i = 0; i < 20; i++) {
      expect(pickNextForReview(pool, attempts).id).toBe(overdueId);
    }
  });

  it("with no attempt history at all, still returns a question from the pool without crashing", () => {
    const pool = [mockQuestion(1), mockQuestion(2), mockQuestion(3)];
    const picked = pickNextForReview(pool, []);
    expect(pool.map((q) => q.id)).toContain(picked.id);
  });
});

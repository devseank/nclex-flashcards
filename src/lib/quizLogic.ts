import { Question } from "@/services/questions";
import { Attempt } from "@/services/attempts";
import { Mode } from "@/components/Landing";

export type SessionMode = Mode | "review";

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

export function isCorrect(question: Question, response: number[]): boolean {
  if (question.type === "sequence") {
    return (
      response.length === question.correctOrder.length &&
      response.every((choiceIndex, position) => choiceIndex === question.correctOrder[position])
    );
  }
  return (
    response.length === question.correctIndices.length &&
    response.every((i) => question.correctIndices.includes(i))
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

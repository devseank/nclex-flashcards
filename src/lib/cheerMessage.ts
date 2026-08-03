import { QuestionStats } from "@/services/attempts";

function daysSince(dateIso: string): number {
  const ms = Date.now() - new Date(dateIso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// Mario/Pokemon-flavored power-up emoji -- picked deterministically per
// question (not Math.random()) so the same stats always render the same
// emoji instead of flickering between re-renders.
const CHEER_EMOJIS = ["🍄", "⭐", "🪙", "⚡", "🔥", "👾", "🎮"];

function pickCheerEmoji(seed: number): string {
  return CHEER_EMOJIS[seed % CHEER_EMOJIS.length];
}

// Always returns a message while a question is being attempted: a brand-new
// one (no `stats` yet) gets a "first try" cheer, seeded off its id so the
// same question always shows the same emoji; one with history reflects its
// attempt count/staleness instead.
export function cheerMessage(stats: QuestionStats | undefined, questionId: number): string {
  if (!stats) {
    return `First time seeing this one — let's go! ${pickCheerEmoji(questionId)}`;
  }

  const days = daysSince(stats.lastAttemptedAt);
  const attemptNumber = stats.totalAttempts + 1;

  const parts: string[] = [];
  if (days >= 21) parts.push(`It's been ${days} days since you last saw this one.`);
  else if (days >= 7) parts.push("It's been a while since you last saw this one.");

  if (attemptNumber >= 2) parts.push(`This is your ${ordinal(attemptNumber)} try.`);

  const emoji = pickCheerEmoji(stats.totalAttempts * 31 + days);
  parts.push(`You've got this! ${emoji}`);
  return parts.join(" ");
}

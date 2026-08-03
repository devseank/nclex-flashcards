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

// Only meaningful once a question has history (`stats` is only ever passed
// for review-mode sessions), so a brand-new question never gets one.
export function cheerMessage(stats: QuestionStats | undefined): string | null {
  if (!stats) return null;

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

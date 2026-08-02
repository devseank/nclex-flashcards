import { Attempt } from "@/services/attempts";
import { startOfDay, startOfToday, startOfWeek } from "@/lib/dateRanges";

export type AnalyticsRange = "today" | "week" | "all";

export type TrendPoint = { label: string; count: number };

const HOUR_LABELS = [
  "12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a",
  "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Hourly buckets from midnight through the current hour, so the trend for
// "today" shows what time of day study sessions happened.
function trendForToday(attempts: Attempt[]): TrendPoint[] {
  const todayStart = startOfToday();
  const currentHour = new Date().getHours();
  const counts = new Array(currentHour + 1).fill(0);

  for (const a of attempts) {
    const attemptedAt = new Date(a.attemptedAt);
    if (attemptedAt >= todayStart) counts[attemptedAt.getHours()] += 1;
  }

  return counts.map((count, hour) => ({ label: HOUR_LABELS[hour], count }));
}

// Daily buckets for the last 7 days (today back 6 days).
function trendForWeek(attempts: Attempt[]): TrendPoint[] {
  const today = startOfToday();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const countsByDay = new Map(days.map((d) => [dateKey(d), 0]));
  for (const a of attempts) {
    const key = a.attemptedAt.slice(0, 10);
    if (countsByDay.has(key)) countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  return days.map((d) => ({
    label: WEEKDAY_LABELS[d.getDay()],
    count: countsByDay.get(dateKey(d)) ?? 0,
  }));
}

// Weekly buckets from the first attempt's week through the current week, so
// "all time" stays readable no matter how long the question bank's been used.
function trendForAllTime(attempts: Attempt[]): TrendPoint[] {
  if (attempts.length === 0) return [];

  const earliestAttemptedAt = attempts.reduce(
    (min, a) => (a.attemptedAt < min ? a.attemptedAt : min),
    attempts[0].attemptedAt,
  );
  const currentWeekStart = startOfWeek();

  const weeks: Date[] = [];
  for (
    let weekStart = startOfWeek(new Date(earliestAttemptedAt));
    weekStart <= currentWeekStart;
    weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  ) {
    weeks.push(weekStart);
  }

  const countsByWeek = new Map(weeks.map((w) => [dateKey(w), 0]));
  for (const a of attempts) {
    const key = dateKey(startOfWeek(startOfDay(new Date(a.attemptedAt))));
    if (countsByWeek.has(key)) countsByWeek.set(key, (countsByWeek.get(key) ?? 0) + 1);
  }

  return weeks.map((w) => ({
    label: `${w.getMonth() + 1}/${w.getDate()}`,
    count: countsByWeek.get(dateKey(w)) ?? 0,
  }));
}

export function buildTrendData(attempts: Attempt[], range: AnalyticsRange): TrendPoint[] {
  if (range === "today") return trendForToday(attempts);
  if (range === "week") return trendForWeek(attempts);
  return trendForAllTime(attempts);
}

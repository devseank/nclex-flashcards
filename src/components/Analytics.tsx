"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAttempts, Attempt } from "@/services/attempts";
import { Question } from "@/services/questions";
import PixelWindow from "@/components/PixelWindow";
import InfoTooltip from "@/components/InfoTooltip";
import RangeSelect, { RANGE_LABELS } from "@/components/RangeSelect";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/dateRanges";
import { AnalyticsRange, buildTrendData } from "@/lib/analyticsTrend";

// Fixed hex values, not CSS vars -- these are passed as SVG stroke/fill
// props straight to recharts, which needs literal color strings rather than
// `var(--...)` (recharts doesn't re-render on a CSS custom property change,
// e.g. a dark-mode toggle, so these intentionally stay constant in both
// themes rather than trying to track it).
const NAVY = "#12314a";
const BLUE = "#209cee";
const GREEN = "#92cc41";
const YELLOW = "#f7d51d";
const RED = "#e76e55";

const pixelTooltipStyle = {
  contentStyle: {
    border: `2px solid ${NAVY}`,
    borderRadius: 0,
    fontFamily: "var(--font-body), sans-serif",
    fontSize: 12,
  },
  labelStyle: { color: NAVY, fontWeight: 700 },
};

const TREND_TOOLTIP =
  "How many questions you've answered, grouped by hour (Today), day (This week), or week (All time).";
const CATEGORIES_TOOLTIP =
  "Accuracy per category for the selected range, sorted worst to best so you know what to review first. Green = 80%+, yellow = 50-79%, red = under 50%.";

export default function Analytics({
  questions,
  onBack,
}: {
  questions: Question[];
  onBack: () => void;
}) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<AnalyticsRange>("week");
  const [categoriesRange, setCategoriesRange] = useState<AnalyticsRange>("week");

  useEffect(() => {
    fetchAttempts()
      .then(setAttempts)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const backLink = (
    <button
      type="button"
      onClick={onBack}
      className="font-pixel text-[10px] text-[var(--text-navy)] underline self-start"
    >
      ← MENU
    </button>
  );

  if (error) {
    return (
      <div className="w-full max-w-xl flex flex-col gap-4">
        {backLink}
        <p className="font-pixel text-sm text-[var(--text-navy)] text-center leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!attempts) {
    return (
      <div className="w-full max-w-xl flex flex-col gap-4">
        {backLink}
      </div>
    );
  }

  const categoryById = new Map(questions.map((q) => [q.id, q.category]));

  const todayStart = startOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const todayCount = attempts.filter((a) => new Date(a.attemptedAt) >= todayStart).length;
  const weekCount = attempts.filter((a) => new Date(a.attemptedAt) >= weekStart).length;
  const monthCount = attempts.filter((a) => new Date(a.attemptedAt) >= monthStart).length;

  const trendData = buildTrendData(attempts, trendRange);

  const categoriesRangeStart =
    categoriesRange === "today" ? todayStart : categoriesRange === "week" ? weekStart : null;
  const categoriesRangeAttempts = categoriesRangeStart
    ? attempts.filter((a) => new Date(a.attemptedAt) >= categoriesRangeStart)
    : attempts;

  const categoryStats = new Map<string, { correct: number; total: number }>();
  for (const a of categoriesRangeAttempts) {
    const cat = categoryById.get(a.questionId) ?? "Unknown";
    const s = categoryStats.get(cat) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (a.isCorrect) s.correct += 1;
    categoryStats.set(cat, s);
  }
  const categoryData = [...categoryStats.entries()]
    .map(([category, s]) => ({
      category,
      accuracy: Math.round((s.correct / s.total) * 100),
      total: s.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="w-full max-w-xl flex flex-col gap-6">
      {backLink}

      <PixelWindow title="STATS.EXE">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-pixel text-xl text-[var(--text-navy-strong)]">{todayCount}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div>
            <p className="font-pixel text-xl text-[var(--text-navy-strong)]">{weekCount}</p>
            <p className="text-xs text-gray-500">This week</p>
          </div>
          <div>
            <p className="font-pixel text-xl text-[var(--text-navy-strong)]">{monthCount}</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
        </div>
      </PixelWindow>

      <PixelWindow title="TREND.EXE" titleExtra={<InfoTooltip text={TREND_TOOLTIP} />}>
        <div className="flex flex-col gap-3">
          <RangeSelect value={trendRange} onChange={setTrendRange} />
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                <XAxis dataKey="label" fontSize={10} stroke={NAVY} />
                <YAxis allowDecimals={false} fontSize={10} stroke={NAVY} width={24} />
                <Tooltip {...pixelTooltipStyle} />
                <Bar dataKey="count" fill={BLUE} radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </PixelWindow>

      <PixelWindow title="CATEGORIES.EXE" titleExtra={<InfoTooltip text={CATEGORIES_TOOLTIP} />}>
        <div className="flex flex-col gap-3">
          <RangeSelect value={categoriesRange} onChange={setCategoriesRange} />
          {categoryData.length > 0 ? (
            <div style={{ height: Math.max(160, categoryData.length * 40) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} stroke={NAVY} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    fontSize={10}
                    stroke={NAVY}
                    width={110}
                  />
                  <Tooltip {...pixelTooltipStyle} formatter={(v) => `${v}%`} />
                  <Bar dataKey="accuracy" radius={0}>
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.accuracy >= 80 ? GREEN : entry.accuracy >= 50 ? YELLOW : RED}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              {attempts.length === 0
                ? "No attempts yet — answer some questions to see stats here."
                : `No attempts in "${RANGE_LABELS[categoriesRange]}" — try a wider range.`}
            </p>
          )}
        </div>
      </PixelWindow>
    </div>
  );
}

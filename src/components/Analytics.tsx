"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  LabelProps,
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
import { useIsDarkMode } from "@/lib/useIsDarkMode";

// Bar fill colors stay fixed in both themes -- they're already saturated
// enough to read fine against either a light or dark card.
const BLUE = "#209cee";
const GREEN = "#92cc41";
const YELLOW = "#f7d51d";
const RED = "#e76e55";

// Axis/grid/tooltip colors, unlike the bar fills above, MUST flip with the
// theme (dark navy text is invisible on a dark card) -- but they're passed
// as SVG stroke/fill props straight to recharts, which needs a literal
// color string, not `var(--...)` (recharts doesn't re-render just because
// a CSS custom property changed underneath it). useIsDarkMode() makes this
// a real prop-value change on a real re-render instead.
const NAVY_LIGHT = "#12314a";
const NAVY_DARK = "#cfe6ff";
const GRID_LIGHT = "#ddd";
const GRID_DARK = "#3d4c63";
const TOOLTIP_BG_LIGHT = "#ffffff";
const TOOLTIP_BG_DARK = "#1b2432";

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
  const isDark = useIsDarkMode();
  const navy = isDark ? NAVY_DARK : NAVY_LIGHT;
  const gridStroke = isDark ? GRID_DARK : GRID_LIGHT;
  const tooltipStyle = {
    contentStyle: {
      border: `2px solid ${navy}`,
      borderRadius: 0,
      fontFamily: "var(--font-body), sans-serif",
      fontSize: 12,
      backgroundColor: isDark ? TOOLTIP_BG_DARK : TOOLTIP_BG_LIGHT,
      color: navy,
    },
    labelStyle: { color: navy, fontWeight: 700 },
  };

  // Renders the category name in the reserved right-hand margin (see
  // categoryChartRightMargin below) instead of in a YAxis column to the
  // *left*, so long names (e.g. "Maternal-Newborn") no longer eat into the
  // chart's plotting width -- the reason bars used to start well right of
  // the card's left edge. Recharts hands every label the same
  // `parentViewBox` (the plot area's own bounding box, identical for every
  // row) rather than that row's own bar geometry, so anchoring at its right
  // edge with textAnchor="end" right-aligns every name at one consistent x
  // regardless of how long that row's own bar is -- never inside a bar,
  // never at a ragged, differently-placed spot per row. Always the
  // theme-aware `navy`: this column sits in the margin, past where any bar
  // can reach, so it's always over the plain card background, never a bar's
  // own fill color.
  function renderCategoryLabel(props: LabelProps) {
    const y = Number(props.y ?? 0);
    const height = Number(props.height ?? 0);
    // This chart is cartesian (never polar), so parentViewBox is always the
    // {x, y, width, height} shape -- narrow past the ViewBox union's polar
    // half, which has no x/width, to read them.
    const parentViewBox = props.parentViewBox as { x?: number; width?: number } | undefined;
    // parentViewBox already spans the full reserved area including
    // categoryChartRightMargin (its right edge is the chart's own right
    // edge, not the axis's 0-100 plotting range) -- anchoring there directly
    // puts every label inside that reserved strip, no further offset needed.
    const rightEdge = Number(parentViewBox?.x ?? 0) + Number(parentViewBox?.width ?? 0) - 4;
    return (
      <text x={rightEdge} y={y + height / 2} fontSize={10} fill={navy} textAnchor="end" dominantBaseline="middle">
        {props.value}
      </text>
    );
  }

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

  // Every label renders right-aligned in this reserved right-hand strip
  // (see renderCategoryLabel) rather than a YAxis column on the left, so
  // it needs to be wide enough for the longest category name or that name
  // would get clipped against the card's own edge.
  const longestCategoryName = Math.max(0, ...categoryData.map((d) => d.category.length));
  const categoryChartRightMargin = longestCategoryName * 5.5 + 12;

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
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" fontSize={10} stroke={navy} tick={{ fill: navy }} />
                <YAxis allowDecimals={false} fontSize={10} stroke={navy} tick={{ fill: navy }} width={24} />
                <Tooltip {...tooltipStyle} />
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
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: categoryChartRightMargin }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} stroke={navy} tick={{ fill: navy }} />
                  {/* No visible tick text -- category names render in the
                      reserved right-hand margin via renderCategoryLabel
                      below, so this axis only needs to exist for the
                      categorical scale. */}
                  <YAxis type="category" dataKey="category" width={1} axisLine={false} tickLine={false} tick={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
                  <Bar dataKey="accuracy" radius={0}>
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.accuracy >= 80 ? GREEN : entry.accuracy >= 50 ? YELLOW : RED}
                      />
                    ))}
                    <LabelList dataKey="category" content={renderCategoryLabel} />
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

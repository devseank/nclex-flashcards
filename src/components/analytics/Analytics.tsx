"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Cell, LabelList, LabelProps, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart as RechartsBarChart, Bar } from "recharts";
import { fetchAttempts, Attempt } from "@/services/attempts";
import { QuestionMeta } from "@/services/questions";
import PixelWindow from "@/components/ui/PixelWindow";
import TitleBar from "@/components/ui/TitleBar";
import HeaderActions from "@/components/ui/HeaderActions";
import InfoTooltip from "@/components/ui/InfoTooltip";
import RangeSelect, { RANGE_LABELS } from "@/components/ui/RangeSelect";
import { BarChart } from "@/components/ui/tremor/BarChart";
import { getErrorMessage } from "@/lib/errorMessage";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/dateRanges";
import { AnalyticsRange, buildTrendData } from "@/lib/analyticsTrend";
import { useIsDarkMode } from "@/lib/useIsDarkMode";

// The category-accuracy chart still needs per-row conditional coloring
// (highlight only the categories that need review) -- a shape Tremor Raw's
// BarChart doesn't support (its `colors` prop assigns one color per data
// *series*, not per row within one series), so it stays on raw recharts,
// restyled to the new tokens. The trend chart below (a single plain series)
// has no such requirement and uses the vendored Tremor BarChart instead.
//
// recharts renders plain SVG with whatever color values it's given at
// render time -- it has no idea about CSS custom properties, so passing
// `var(--foreground)` as a stroke/fill prop won't update when the theme
// toggles. These literal light/dark pairs mirror theme.css's own token
// values; useIsDarkMode() makes them a real prop-value change on a real
// re-render instead.
const FOREGROUND_LIGHT = "#111111";
const FOREGROUND_DARK = "#f2f2ee";
const BORDER_MUTED_LIGHT = "#d9d9d4";
const BORDER_MUTED_DARK = "#262626";
const MUTED_FOREGROUND_LIGHT = "#5c5c58";
const MUTED_FOREGROUND_DARK = "#9a9a94";
const SURFACE_LIGHT = "#ffffff";
const SURFACE_DARK = "#141414";
const BORDER_LIGHT = "#000000";
const BORDER_DARK = "#e8e8e2";
const SIGNAL_LIGHT = "#b87400";
const SIGNAL_DARK = "#ffb000";

const TREND_TOOLTIP =
  "How many questions you've answered, grouped by hour (Today), day (This week), or week (All time).";
const CATEGORIES_TOOLTIP =
  "Accuracy per category for the selected range, sorted worst to best so you know what to review first. Highlighted = under 50%, needs review.";

export default function Analytics({
  questions,
}: {
  questions: QuestionMeta[];
}) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<AnalyticsRange>("week");
  const [categoriesRange, setCategoriesRange] = useState<AnalyticsRange>("week");
  const isDark = useIsDarkMode();
  const foreground = isDark ? FOREGROUND_DARK : FOREGROUND_LIGHT;
  const mutedForeground = isDark ? MUTED_FOREGROUND_DARK : MUTED_FOREGROUND_LIGHT;
  const gridStroke = isDark ? BORDER_MUTED_DARK : BORDER_MUTED_LIGHT;
  const signal = isDark ? SIGNAL_DARK : SIGNAL_LIGHT;
  const tooltipStyle = {
    contentStyle: {
      border: `1px solid ${isDark ? BORDER_DARK : BORDER_LIGHT}`,
      borderRadius: 0,
      fontFamily: "var(--font-mono), monospace",
      fontSize: 12,
      backgroundColor: isDark ? SURFACE_DARK : SURFACE_LIGHT,
      color: foreground,
    },
    labelStyle: { color: foreground, fontWeight: 700 },
    // recharts' own item-value line defaults to a hardcoded black (or the
    // bar's own fill color) when no itemStyle is given -- fine against the
    // light tooltip background, but nearly invisible against the dark one,
    // since nothing here was overriding it before.
    itemStyle: { color: foreground },
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
  // theme-aware `foreground`: this column sits in the margin, past where any
  // bar can reach, so it's always over the plain card background, never a
  // bar's own fill color.
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
      <text x={rightEdge} y={y + height / 2} fontSize={10} fill={foreground} textAnchor="end" dominantBaseline="middle">
        {props.value}
      </text>
    );
  }

  useEffect(() => {
    fetchAttempts()
      .then(setAttempts)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const titleBar = <TitleBar left="ANALYTICS" action={<HeaderActions />} />;

  if (error) {
    return (
      <div className="w-full max-w-xl flex flex-col gap-4">
        {titleBar}
        <p className="font-mono text-sm text-[var(--foreground)] text-center leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!attempts) {
    return (
      <div className="w-full max-w-xl flex flex-col gap-4">
        {titleBar}
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
      {titleBar}

      <PixelWindow title="STATS.EXE" wide>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-mono text-xl text-[var(--foreground)]">{todayCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Today</p>
          </div>
          <div>
            <p className="font-mono text-xl text-[var(--foreground)]">{weekCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">This week</p>
          </div>
          <div>
            <p className="font-mono text-xl text-[var(--foreground)]">{monthCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">This month</p>
          </div>
        </div>
      </PixelWindow>

      <PixelWindow title="TREND.EXE" titleExtra={<InfoTooltip text={TREND_TOOLTIP} />} wide>
        <div className="flex flex-col gap-3">
          <RangeSelect value={trendRange} onChange={setTrendRange} />
          <BarChart
            data={trendData}
            index="label"
            categories={["count"]}
            colors={["signal"]}
            showLegend={false}
            allowDecimals={false}
            valueFormatter={(v) => `${v}`}
            className="h-48 font-mono"
          />
        </div>
      </PixelWindow>

      <PixelWindow title="CATEGORIES.EXE" titleExtra={<InfoTooltip text={CATEGORIES_TOOLTIP} />} wide>
        <div className="flex flex-col gap-3">
          <RangeSelect value={categoriesRange} onChange={setCategoriesRange} />
          {categoryData.length > 0 ? (
            <div style={{ height: Math.max(160, categoryData.length * 40) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={categoryData} layout="vertical" margin={{ left: 8, right: categoryChartRightMargin }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} stroke={foreground} tick={{ fill: foreground }} />
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
                        fill={entry.accuracy < 50 ? signal : mutedForeground}
                      />
                    ))}
                    <LabelList dataKey="category" content={renderCategoryLabel} />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center">
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

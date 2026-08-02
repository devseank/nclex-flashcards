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
import { getErrorMessage } from "@/lib/errorMessage";

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

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function Analytics({
  questions,
  onBack,
}: {
  questions: Question[];
  onBack: () => void;
}) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttempts()
      .then(setAttempts)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const backLink = (
    <button
      type="button"
      onClick={onBack}
      className="font-pixel text-[10px] text-[#33415c] underline self-start"
    >
      ← MENU
    </button>
  );

  if (error) {
    return (
      <div className="w-full max-w-xl flex flex-col gap-4">
        {backLink}
        <p className="font-pixel text-sm text-[#33415c] text-center leading-relaxed">{error}</p>
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

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayCount = attempts.filter((a) => new Date(a.attemptedAt) >= startOfDay).length;
  const weekCount = attempts.filter((a) => new Date(a.attemptedAt) >= startOfWeek).length;
  const monthCount = attempts.filter((a) => new Date(a.attemptedAt) >= startOfMonth).length;

  const dayKeys = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startOfDay);
    d.setDate(startOfDay.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const countsByDay = new Map(dayKeys.map((d) => [d, 0]));
  for (const a of attempts) {
    const key = dateKey(a.attemptedAt);
    if (countsByDay.has(key)) countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }
  const dailyData = dayKeys.map((d) => ({
    day: d.slice(5).replace("-", "/"),
    count: countsByDay.get(d) ?? 0,
  }));

  const categoryStats = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
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
            <p className="font-pixel text-xl text-[#12314a]">{todayCount}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div>
            <p className="font-pixel text-xl text-[#12314a]">{weekCount}</p>
            <p className="text-xs text-gray-500">This week</p>
          </div>
          <div>
            <p className="font-pixel text-xl text-[#12314a]">{monthCount}</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
        </div>
      </PixelWindow>

      <PixelWindow title="TREND.EXE">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis dataKey="day" fontSize={10} stroke={NAVY} />
              <YAxis allowDecimals={false} fontSize={10} stroke={NAVY} width={24} />
              <Tooltip {...pixelTooltipStyle} />
              <Bar dataKey="count" fill={BLUE} radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PixelWindow>

      {categoryData.length > 0 ? (
        <PixelWindow title="CATEGORIES.EXE">
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
        </PixelWindow>
      ) : (
        <p className="text-sm text-gray-500 text-center">
          No attempts yet — answer some questions to see stats here.
        </p>
      )}
    </div>
  );
}

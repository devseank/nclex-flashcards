import { AnalyticsRange } from "@/lib/analyticsTrend";

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  today: "Today",
  week: "This week",
  all: "All time",
};

export default function RangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}) {
  return (
    <div className="nes-select">
      <select value={value} onChange={(e) => onChange(e.target.value as AnalyticsRange)}>
        {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((r) => (
          <option key={r} value={r}>
            {RANGE_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}

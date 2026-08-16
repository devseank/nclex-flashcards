"use client";

import { AnalyticsRange } from "@/lib/analyticsTrend";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";

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
    <Select value={value} onValueChange={(v) => onChange(v as AnalyticsRange)}>
      <SelectTrigger className="font-mono text-xs uppercase tracking-wider border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus-visible:ring-[var(--signal)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="font-mono border-[var(--border)]">
        {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((r) => (
          <SelectItem key={r} value={r} className="text-xs uppercase tracking-wider">
            {RANGE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

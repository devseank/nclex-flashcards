// Vendored from Tremor Raw (https://tremor.so/docs/utilities/chartUtils),
// trimmed down to exactly two color keys -- "gray" (neutral) and "signal"
// (the app's one accent, mapped to --signal via the `--color-signal-500`
// token in theme.css) -- so no chart call site can reach for
// blue/emerald/violet/etc, which have no home in the monochrome+one-accent
// design. See /Users/sean/.claude/plans/buzzing-orbiting-newell.md.

// Tremor chartColors [v0.1.0]
export type ColorUtility = "bg" | "stroke" | "fill" | "text";
export const chartColors = {
  gray: {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  },
  signal: {
    bg: "bg-signal-500",
    stroke: "stroke-signal-500",
    fill: "fill-signal-500",
    text: "text-signal-500",
  },
} as const satisfies {
  [color: string]: {
    [key in ColorUtility]: string;
  };
};

export type AvailableChartColorsKeys = keyof typeof chartColors;
export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
  chartColors,
) as Array<AvailableChartColorsKeys>;

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>();
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length]);
  });
  return categoryColors;
};

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: ColorUtility,
): string => {
  const fallbackColor = {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  };
  return chartColors[color]?.[type] ?? fallbackColor[type];
};

// Tremor getYAxisDomain [v0.0.0]
export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0);
  const maxDomain = maxValue ?? "auto";
  return [minDomain, maxDomain];
};

// Tremor hasOnlyOneValueForKey [v0.1.0]
export function hasOnlyOneValueForKey(
  array: Record<string, unknown>[],
  keyToCheck: string,
): boolean {
  const val: unknown[] = [];

  for (const obj of array) {
    if (Object.prototype.hasOwnProperty.call(obj, keyToCheck)) {
      val.push(obj[keyToCheck]);
      if (val.length > 1) {
        return false;
      }
    }
  }

  return true;
}

import { TagColorMap } from "@/services/settings";

// A small, visually distinct set of swatches offered in the tag color
// picker -- not exhaustive (the underlying storage is a plain hex string,
// so nothing stops a future "custom hex" input), just a fast, thumb-sized
// set of good defaults.
export const TAG_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#78716c",
];

// Deterministic (same tag -> same color across reloads/devices) so a tag
// looks consistent before the user ever opens the color picker -- hashes
// the full string rather than e.g. its length or first letter, so
// similarly-shaped tags ("rule"/"risk") don't collide onto the same slot.
function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Case-insensitive lookup, same key convention as fetchNoteTagVocabulary's
// de-dupe -- falls back to the hashed default until the user customizes it.
export function getTagColor(colors: TagColorMap, tag: string): string {
  const key = tag.toLowerCase();
  return colors[key] ?? TAG_COLOR_PALETTE[hashTag(key) % TAG_COLOR_PALETTE.length];
}

// Relative luminance (WCAG) rather than a naive "average the channels"
// check -- green reads as much brighter than blue at the same numeric
// value, so weighting channels equally picks the wrong text color on
// several palette entries above (e.g. the blue and violet swatches).
export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

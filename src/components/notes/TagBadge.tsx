import { TagColorMap } from "@/services/settings";
import { getTagColor, readableTextColor } from "@/lib/tagColors";

// The read-only tag chip shown wherever a note's tag is displayed
// (NotePreview/NotesDetail's non-editing view, NotesList's row preview).
// Deliberately as small as the text stays legible at -- this sits inline
// next to note body text, not as a standalone control.
export default function TagBadge({ tag, colors }: { tag: string; colors: TagColorMap }) {
  const background = getTagColor(colors, tag);
  const color = readableTextColor(background);
  return (
    <span
      className="shrink-0 inline-block font-mono text-[8px] font-bold uppercase tracking-wider leading-none px-1 py-[3px]"
      style={{ backgroundColor: background, color }}
    >
      {tag}
    </span>
  );
}

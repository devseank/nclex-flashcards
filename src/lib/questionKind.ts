import { Question } from "@/services/questions";

export type QuestionKind = "single" | "sata" | "sequence" | "grid" | "cloze" | "bowtie" | "hotspot";

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: "SINGLE CHOICE",
  sata: "SATA",
  sequence: "SEQUENCE",
  grid: "GRID",
  cloze: "CLOZE",
  bowtie: "BOWTIE",
  hotspot: "HOT SPOT",
};

// SATA ("select all that apply") and single-choice are both question_type
// "choice" -- the only thing distinguishing them is how many correct
// indices there are, so no separate DB column is needed for this filter.
// Generic over T so this works against both a full Question and the
// lightweight QuestionMeta -- both structurally satisfy this constraint,
// so no caller needs to change.
export function matchesKind<T extends { type: Question["type"]; correctIndices?: number[] }>(
  question: T,
  kind: QuestionKind,
): boolean {
  if (kind === "sequence") return question.type === "sequence";
  if (kind === "grid") return question.type === "grid";
  if (kind === "cloze") return question.type === "cloze";
  if (kind === "bowtie") return question.type === "bowtie";
  if (kind === "hotspot") return question.type === "hotspot";
  if (question.type !== "choice") return false;
  // `correctIndices` is only optional in T's type signature because
  // QuestionMeta's non-choice rows lack it -- a "choice"-type row always
  // has it populated, generic T just can't express that discriminated-union
  // narrowing the way the real Question/QuestionMeta union types do.
  const correctIndices = question.correctIndices ?? [];
  return kind === "sata" ? correctIndices.length > 1 : correctIndices.length === 1;
}

import { Question } from "@/services/questions";

export type QuestionKind = "single" | "sata" | "sequence" | "grid";

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: "SINGLE CHOICE",
  sata: "SATA",
  sequence: "SEQUENCE",
  grid: "GRID",
};

// SATA ("select all that apply") and single-choice are both question_type
// "choice" -- the only thing distinguishing them is how many correct
// indices there are, so no separate DB column is needed for this filter.
export function matchesKind(question: Question, kind: QuestionKind): boolean {
  if (kind === "sequence") return question.type === "sequence";
  if (kind === "grid") return question.type === "grid";
  if (question.type !== "choice") return false;
  return kind === "sata" ? question.correctIndices.length > 1 : question.correctIndices.length === 1;
}

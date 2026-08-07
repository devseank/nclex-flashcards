import { supabase } from "@/lib/supabase";

type QuestionBase = {
  id: number;
  // Exactly one, required -- the bounded "what kind of question" dimension
  // (Pharmacology, Prioritization, Maternal-Newborn, ...).
  category: string;
  // Zero or more freeform tags, NOT scoped to a single category -- the
  // "what's it about" dimension (e.g. "Respiratory" can tag both a
  // Pharmacology question and a Prioritization question). No fixed
  // taxonomy: whatever strings appear across all questions' tags *are* the
  // tag list (see src/lib/tags.ts).
  tags: string[];
  question: string;
  choices: string[];
  rationale: string;
  createdAt: string;
  // A URL to an illustration for this question (e.g. an anatomy diagram),
  // if any -- undefined for the common case of no image. Multiple
  // questions can share the same URL when they refer to the same image.
  imageUrl?: string;
  // True when the choices/rationale (or both) were written by an AI to
  // reconstruct a question the source didn't give us enough to transcribe
  // faithfully -- surfaced as a small badge in the UI. Undefined/false for
  // the normal case of a faithful transcription.
  aiGenerated?: boolean;
};

export type ChoiceQuestion = QuestionBase & {
  type: "choice";
  correctIndices: number[];
};

export type SequenceQuestion = QuestionBase & {
  type: "sequence";
  // a permutation of indices into `choices`, in the correct order
  correctOrder: number[];
};

export type GridQuestion = QuestionBase & {
  type: "grid";
  // `choices` (from QuestionBase) are the row labels. `gridColumns` are the
  // column headers (e.g. ["Indicated", "Not indicated"]). `gridAnswers[i]`
  // is the set of `gridColumns` indices correct for row i of `choices` --
  // single-select is just the every-row-length-1 case (matrix multiple-
  // response is more than one). Comes from the grid_row_answers child
  // table, not a column on this row (see fetchAllQuestions below).
  gridColumns: string[];
  gridAnswers: number[][];
};

export type Question = ChoiceQuestion | SequenceQuestion | GridQuestion;

type QuestionRow = {
  id: number;
  category: string;
  tags: string[];
  question: string;
  choices: string[];
  rationale: string;
  question_type: "choice" | "sequence" | "grid";
  correct_indices: number[] | null;
  correct_order: number[] | null;
  grid_columns: string[] | null;
  created_at: string;
  image_url: string | null;
  ai_generated: boolean;
};

type GridRowAnswerRow = {
  question_id: number;
  row_index: number;
  column_index: number;
};

function toQuestion(row: QuestionRow, gridAnswersByQuestionId: Map<number, number[][]>): Question {
  const base: QuestionBase = {
    id: row.id,
    category: row.category,
    tags: row.tags,
    question: row.question,
    choices: row.choices,
    rationale: row.rationale,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? undefined,
    aiGenerated: row.ai_generated,
  };

  if (row.question_type === "sequence") {
    return { ...base, type: "sequence", correctOrder: row.correct_order ?? [] };
  }
  if (row.question_type === "grid") {
    return {
      ...base,
      type: "grid",
      gridColumns: row.grid_columns ?? [],
      gridAnswers: gridAnswersByQuestionId.get(row.id) ?? [],
    };
  }
  return { ...base, type: "choice", correctIndices: row.correct_indices ?? [] };
}

// Builds { questionId -> [rowIndex -> [columnIndex, ...]] } from the flat
// grid_row_answers rows -- one row per correct cell, grouped and re-indexed
// into the per-row array shape GridQuestion.gridAnswers expects.
function groupGridRowAnswers(rows: GridRowAnswerRow[]): Map<number, number[][]> {
  const byQuestion = new Map<number, number[][]>();
  for (const r of rows) {
    const rowAnswers = byQuestion.get(r.question_id) ?? [];
    rowAnswers[r.row_index] = [...(rowAnswers[r.row_index] ?? []), r.column_index];
    byQuestion.set(r.question_id, rowAnswers);
  }
  return byQuestion;
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const [{ data, error }, { data: gridRowAnswerData, error: gridError }] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "id, category, tags, question, choices, rationale, question_type, correct_indices, correct_order, grid_columns, created_at, image_url, ai_generated",
      ),
    supabase.from("grid_row_answers").select("question_id, row_index, column_index"),
  ]);

  if (error) throw error;
  if (gridError) throw gridError;

  const gridAnswersByQuestionId = groupGridRowAnswers(gridRowAnswerData ?? []);
  return (data ?? []).map((row) => toQuestion(row, gridAnswersByQuestionId));
}

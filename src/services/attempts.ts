import { supabase } from "@/lib/supabase";

// `user_id` is never passed from the client on insert (see recordAttempt
// below) -- the column defaults to auth.uid() and RLS scopes every select
// to `user_id = auth.uid()`, so the Postgres side enforces per-user
// isolation regardless of what this code does. See supabase/schema.sql.

export type Attempt = {
  id: number;
  questionId: number;
  selectedIndices: number[];
  // Only present for a grid-multi-response attempt (see recordAttempt) --
  // selectedIndices is an empty placeholder array in that case, since the
  // DB column stays not-null for every attempt but a grid answer's real
  // shape (a variable number of selected columns per row) lives in the
  // attempt_grid_selections child table instead.
  gridSelections?: number[][];
  isCorrect: boolean;
  attemptedAt: string;
};

type AttemptRow = {
  id: number;
  question_id: number;
  selected_indices: number[];
  is_correct: boolean;
  attempted_at: string;
};

type AttemptGridSelectionRow = {
  attempt_id: number;
  row_index: number;
  column_index: number;
};

function groupGridSelections(rows: AttemptGridSelectionRow[]): Map<number, number[][]> {
  const byAttempt = new Map<number, number[][]>();
  for (const r of rows) {
    const rowSelections = byAttempt.get(r.attempt_id) ?? [];
    rowSelections[r.row_index] = [...(rowSelections[r.row_index] ?? []), r.column_index];
    byAttempt.set(r.attempt_id, rowSelections);
  }
  return byAttempt;
}

function toAttempt(row: AttemptRow, gridSelectionsByAttemptId: Map<number, number[][]>): Attempt {
  return {
    id: row.id,
    questionId: row.question_id,
    selectedIndices: row.selected_indices,
    gridSelections: gridSelectionsByAttemptId.get(row.id),
    isCorrect: row.is_correct,
    attemptedAt: row.attempted_at,
  };
}

// `response` is either a flat number[] (choice/sequence/cloze -- stored
// directly in selected_indices) or a grid's number[][] (one array of
// selected column indices per row -- stored in attempt_grid_selections
// instead, keyed by the newly-inserted attempt's own id).
export async function recordAttempt(
  questionId: number,
  response: number[] | number[][],
  isCorrect: boolean,
): Promise<void> {
  const isGridResponse = Array.isArray(response[0]);
  const { data, error } = await supabase
    .from("attempts")
    .insert({
      question_id: questionId,
      selected_indices: isGridResponse ? [] : response,
      is_correct: isCorrect,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (isGridResponse) {
    const rows = (response as number[][]).flatMap((columns, rowIndex) =>
      columns.map((columnIndex) => ({ attempt_id: data.id, row_index: rowIndex, column_index: columnIndex })),
    );
    if (rows.length > 0) {
      const { error: gridError } = await supabase.from("attempt_grid_selections").insert(rows);
      if (gridError) throw gridError;
    }
  }
}

export async function fetchAttempts(): Promise<Attempt[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select("id, question_id, selected_indices, is_correct, attempted_at")
    .order("attempted_at", { ascending: true });
  if (error) throw error;

  const attemptIds = (data ?? []).map((r) => r.id);
  const { data: gridSelectionData, error: gridError } =
    attemptIds.length > 0
      ? await supabase.from("attempt_grid_selections").select("attempt_id, row_index, column_index").in("attempt_id", attemptIds)
      : { data: [], error: null };
  if (gridError) throw gridError;

  const gridSelectionsByAttemptId = groupGridSelections(gridSelectionData ?? []);
  return (data ?? []).map((row) => toAttempt(row, gridSelectionsByAttemptId));
}

// QuestionStats + computeQuestionStats both live in @/lib/quizLogic, not
// here -- it's pure attempt-log math with no Supabase dependency of its
// own, and having it in this file would pull the Supabase client into
// quizLogic.ts (and anything testing it) transitively. Re-exported from
// their real home so existing "from @/services/attempts" imports still
// resolve.
export type { QuestionStats } from "@/lib/quizLogic";
export { computeQuestionStats } from "@/lib/quizLogic";

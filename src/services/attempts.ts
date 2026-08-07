import { supabase } from "@/lib/supabase";
import { isGridResponse, isBowtieResponse, isHotspotResponse } from "@/lib/quizLogic";
import type { QuestionResponse, BowtieResponse, HotspotResponse } from "@/lib/quizLogic";

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
  // Only present for a bowtie attempt (selectedIndices is also an empty
  // placeholder array in that case) -- fixed-shape, so plain columns
  // rather than a child table, same reasoning as the answer key's own
  // bowtie_* columns.
  bowtieResponse?: BowtieResponse;
  // Only present for a hot-spot attempt (selectedIndices also empty) --
  // the clicked point, plain columns since it's a fixed shape too.
  hotspotResponse?: HotspotResponse;
  isCorrect: boolean;
  attemptedAt: string;
};

type AttemptRow = {
  id: number;
  question_id: number;
  selected_indices: number[];
  bowtie_condition: number | null;
  bowtie_actions: number[] | null;
  bowtie_monitor: number[] | null;
  hotspot_x: number | null;
  hotspot_y: number | null;
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
    bowtieResponse:
      row.bowtie_condition !== null
        ? { condition: row.bowtie_condition, actions: row.bowtie_actions ?? [], monitor: row.bowtie_monitor ?? [] }
        : undefined,
    hotspotResponse: row.hotspot_x !== null && row.hotspot_y !== null ? { x: row.hotspot_x, y: row.hotspot_y } : undefined,
    isCorrect: row.is_correct,
    attemptedAt: row.attempted_at,
  };
}

// `response` is a flat number[] (choice/sequence/cloze -- stored directly
// in selected_indices), a grid's number[][] (one array of selected column
// indices per row -- stored in attempt_grid_selections instead, keyed by
// the newly-inserted attempt's own id), bowtie's 3-part object, or hot-
// spot's click point (both of the latter two stored in their own plain
// columns, fixed-shape like their answer keys).
export async function recordAttempt(
  questionId: number,
  response: QuestionResponse,
  isCorrect: boolean,
): Promise<void> {
  const grid = isGridResponse(response);
  const bowtie = isBowtieResponse(response) ? response : null;
  const hotspot = isHotspotResponse(response) ? response : null;

  const { data, error } = await supabase
    .from("attempts")
    .insert({
      question_id: questionId,
      selected_indices: grid || bowtie || hotspot ? [] : response,
      bowtie_condition: bowtie?.condition ?? null,
      bowtie_actions: bowtie?.actions ?? null,
      bowtie_monitor: bowtie?.monitor ?? null,
      hotspot_x: hotspot?.x ?? null,
      hotspot_y: hotspot?.y ?? null,
      is_correct: isCorrect,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (grid) {
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
    .select(
      "id, question_id, selected_indices, bowtie_condition, bowtie_actions, bowtie_monitor, hotspot_x, hotspot_y, is_correct, attempted_at",
    )
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

import { supabase } from "@/lib/supabase";

export type Attempt = {
  id: number;
  questionId: number;
  selectedIndices: number[];
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

function toAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    questionId: row.question_id,
    selectedIndices: row.selected_indices,
    isCorrect: row.is_correct,
    attemptedAt: row.attempted_at,
  };
}

export async function recordAttempt(
  questionId: number,
  selectedIndices: number[],
  isCorrect: boolean,
): Promise<void> {
  const { error } = await supabase.from("attempts").insert({
    question_id: questionId,
    selected_indices: selectedIndices,
    is_correct: isCorrect,
  });
  if (error) throw error;
}

export async function fetchAttempts(): Promise<Attempt[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select("id, question_id, selected_indices, is_correct, attempted_at")
    .order("attempted_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toAttempt);
}

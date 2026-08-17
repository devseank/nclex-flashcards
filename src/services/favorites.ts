import { supabase, fetchAllRows } from "@/lib/supabase";

// `user_id` is never passed from the client on insert -- the column
// defaults to auth.uid() and RLS scopes every select/insert/delete to
// `user_id = auth.uid()`, so the Postgres side enforces per-user isolation
// regardless of what this code does. See supabase/schema.sql.

type FavoriteRow = { question_id: number };

export async function fetchFavoriteIds(): Promise<number[]> {
  const data = await fetchAllRows<FavoriteRow>((from, to) =>
    supabase
      .from("favorites")
      .select("question_id")
      .order("question_id", { ascending: true })
      .range(from, to),
  );
  return data.map((r) => r.question_id);
}

export async function addFavorite(questionId: number): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ question_id: questionId });
  if (error) throw error;
}

export async function removeFavorite(questionId: number): Promise<void> {
  const { error } = await supabase.from("favorites").delete().eq("question_id", questionId);
  if (error) throw error;
}

import { supabase } from "@/lib/supabase";

export type Question = {
  id: number;
  category: string;
  question: string;
  choices: string[];
  correctIndices: number[];
  rationale: string;
};

type QuestionRow = {
  id: number;
  category: string;
  question: string;
  choices: string[];
  correct_indices: number[];
  rationale: string;
};

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    choices: row.choices,
    correctIndices: row.correct_indices,
    rationale: row.rationale,
  };
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, category, question, choices, correct_indices, rationale");

  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

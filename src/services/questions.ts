import { supabase } from "@/lib/supabase";

type QuestionBase = {
  id: number;
  category: string;
  question: string;
  choices: string[];
  rationale: string;
  createdAt: string;
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

export type Question = ChoiceQuestion | SequenceQuestion;

type QuestionRow = {
  id: number;
  category: string;
  question: string;
  choices: string[];
  rationale: string;
  question_type: "choice" | "sequence";
  correct_indices: number[] | null;
  correct_order: number[] | null;
  created_at: string;
};

function toQuestion(row: QuestionRow): Question {
  const base: QuestionBase = {
    id: row.id,
    category: row.category,
    question: row.question,
    choices: row.choices,
    rationale: row.rationale,
    createdAt: row.created_at,
  };

  if (row.question_type === "sequence") {
    return { ...base, type: "sequence", correctOrder: row.correct_order ?? [] };
  }
  return { ...base, type: "choice", correctIndices: row.correct_indices ?? [] };
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, category, question, choices, rationale, question_type, correct_indices, correct_order, created_at");

  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

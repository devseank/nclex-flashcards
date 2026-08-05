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
  tags: string[];
  question: string;
  choices: string[];
  rationale: string;
  question_type: "choice" | "sequence";
  correct_indices: number[] | null;
  correct_order: number[] | null;
  created_at: string;
  image_url: string | null;
};

function toQuestion(row: QuestionRow): Question {
  const base: QuestionBase = {
    id: row.id,
    category: row.category,
    tags: row.tags,
    question: row.question,
    choices: row.choices,
    rationale: row.rationale,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? undefined,
  };

  if (row.question_type === "sequence") {
    return { ...base, type: "sequence", correctOrder: row.correct_order ?? [] };
  }
  return { ...base, type: "choice", correctIndices: row.correct_indices ?? [] };
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, category, tags, question, choices, rationale, question_type, correct_indices, correct_order, created_at, image_url");

  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

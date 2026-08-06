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
  // column headers (e.g. ["Indicated", "Not indicated"]). `gridAnswer[i]`
  // is the index into `gridColumns` that's correct for row i of `choices`.
  gridColumns: string[];
  gridAnswer: number[];
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
  grid_answer: number[] | null;
  created_at: string;
  image_url: string | null;
  ai_generated: boolean;
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
    aiGenerated: row.ai_generated,
  };

  if (row.question_type === "sequence") {
    return { ...base, type: "sequence", correctOrder: row.correct_order ?? [] };
  }
  if (row.question_type === "grid") {
    return { ...base, type: "grid", gridColumns: row.grid_columns ?? [], gridAnswer: row.grid_answer ?? [] };
  }
  return { ...base, type: "choice", correctIndices: row.correct_indices ?? [] };
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, category, tags, question, choices, rationale, question_type, correct_indices, correct_order, grid_columns, grid_answer, created_at, image_url, ai_generated",
    );

  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

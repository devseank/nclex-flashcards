import { supabase, fetchAllRows } from "@/lib/supabase";

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
  rationale: string;
  createdAt: string;
  // Which quiz-content batch/export this question was transcribed from
  // (e.g. "nurselabs", "naxlex") -- provenance, filterable in FILTER so a
  // batch with known-shaky transcription can be excluded from a session.
  source: string;
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
  choices: string[];
  correctIndices: number[];
};

export type SequenceQuestion = QuestionBase & {
  type: "sequence";
  choices: string[];
  // a permutation of indices into `choices`, in the correct order
  correctOrder: number[];
};

export type GridQuestion = QuestionBase & {
  type: "grid";
  // `choices` are the row labels. `gridColumns` are the column headers
  // (e.g. ["Indicated", "Not indicated"]). `gridAnswers[i]` is the set of
  // `gridColumns` indices correct for row i of `choices` -- single-select
  // is just the every-row-length-1 case (matrix multiple-response is more
  // than one). Comes from the grid_row_answers child table, not a column
  // on this row (see fetchAllQuestions below).
  choices: string[];
  gridColumns: string[];
  gridAnswers: number[][];
};

export type ClozeBlank = {
  // This blank's own dropdown options, in display order.
  options: string[];
  // Index into `options` above -- scoped to this blank alone, never
  // compared across blanks.
  correctIndex: number;
};

export type ClozeQuestion = QuestionBase & {
  type: "cloze";
  // The sentence/paragraph, blanks marked {{1}}, {{2}}, ... in reading
  // order -- clozeBlanks[0] corresponds to {{1}}, clozeBlanks[1] to {{2}},
  // and so on. No `choices` here -- each blank has its own option list,
  // there's no single question-level list the way choice/sequence/grid
  // have.
  clozeTemplate: string;
  clozeBlanks: ClozeBlank[];
};

// One bowtie section's own choice list + correct answer(s) -- condition
// picks exactly 1 (answer: number), actions/monitor pick exactly 2
// (answer: number[]), but the shape is otherwise identical, so one type
// covers all three sections.
export type BowtieSection<Answer> = {
  choices: string[];
  answer: Answer;
};

export type BowtieQuestion = QuestionBase & {
  type: "bowtie";
  // Three independent sections sharing the one stem (`question`) -- no
  // top-level `choices` here, each section has its own.
  condition: BowtieSection<number>;
  actions: BowtieSection<number[]>;
  monitor: BowtieSection<number[]>;
};

export type HotspotRegion = { x: number; y: number; width: number; height: number };

export type HotspotQuestion = QuestionBase & {
  type: "hotspot";
  // The one correct clickable rectangle, as fractions (0-1) of the
  // image's own natural pixel width/height -- see `imageUrl` above, which
  // is semantically required for this type (a hot-spot with no image is
  // meaningless). No `choices` here -- there's no candidate list at all,
  // the whole image is the interaction surface.
  hotspotRegion: HotspotRegion;
};

export type Question =
  | ChoiceQuestion
  | SequenceQuestion
  | GridQuestion
  | ClozeQuestion
  | BowtieQuestion
  | HotspotQuestion;

type QuestionRow = {
  id: number;
  category: string;
  tags: string[];
  question: string;
  choices: string[];
  rationale: string;
  question_type: "choice" | "sequence" | "grid" | "cloze" | "bowtie" | "hotspot";
  correct_indices: number[] | null;
  correct_order: number[] | null;
  grid_columns: string[] | null;
  cloze_template: string | null;
  cloze_blanks: ClozeBlankRow[] | null;
  bowtie_condition_choices: string[] | null;
  bowtie_condition_answer: number | null;
  bowtie_action_choices: string[] | null;
  bowtie_action_answer: number[] | null;
  bowtie_monitor_choices: string[] | null;
  bowtie_monitor_answer: number[] | null;
  hotspot_x: number | null;
  hotspot_y: number | null;
  hotspot_width: number | null;
  hotspot_height: number | null;
  created_at: string;
  image_url: string | null;
  ai_generated: boolean;
  source: string;
};

type GridRowAnswerRow = {
  question_id: number;
  row_index: number;
  column_index: number;
};

type ClozeBlankOptionRow = {
  option_index: number;
  label: string;
  is_correct: boolean;
};

type ClozeBlankRow = {
  blank_index: number;
  cloze_blank_options: ClozeBlankOptionRow[];
};

// Sorts the nested cloze_blanks(cloze_blank_options(...)) rows Supabase
// returns (embedded resource order isn't guaranteed) into the ordered
// ClozeBlank[] shape ClozeQuestion expects, and turns each option's own
// `is_correct` flag into a single correctIndex.
function toClozeBlanks(rows: ClozeBlankRow[] | null): ClozeBlank[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.blank_index - b.blank_index)
    .map((blank) => {
      const options = blank.cloze_blank_options.slice().sort((a, b) => a.option_index - b.option_index);
      return { options: options.map((o) => o.label), correctIndex: options.findIndex((o) => o.is_correct) };
    });
}

function toQuestion(row: QuestionRow, gridAnswersByQuestionId: Map<number, number[][]>): Question {
  const base = {
    id: row.id,
    category: row.category,
    tags: row.tags,
    question: row.question,
    rationale: row.rationale,
    createdAt: row.created_at,
    imageUrl: row.image_url ?? undefined,
    aiGenerated: row.ai_generated,
    source: row.source,
  };

  if (row.question_type === "sequence") {
    return { ...base, type: "sequence", choices: row.choices, correctOrder: row.correct_order ?? [] };
  }
  if (row.question_type === "grid") {
    return {
      ...base,
      type: "grid",
      choices: row.choices,
      gridColumns: row.grid_columns ?? [],
      gridAnswers: gridAnswersByQuestionId.get(row.id) ?? [],
    };
  }
  if (row.question_type === "cloze") {
    return {
      ...base,
      type: "cloze",
      clozeTemplate: row.cloze_template ?? "",
      clozeBlanks: toClozeBlanks(row.cloze_blanks),
    };
  }
  if (row.question_type === "bowtie") {
    return {
      ...base,
      type: "bowtie",
      condition: { choices: row.bowtie_condition_choices ?? [], answer: row.bowtie_condition_answer ?? -1 },
      actions: { choices: row.bowtie_action_choices ?? [], answer: row.bowtie_action_answer ?? [] },
      monitor: { choices: row.bowtie_monitor_choices ?? [], answer: row.bowtie_monitor_answer ?? [] },
    };
  }
  if (row.question_type === "hotspot") {
    return {
      ...base,
      type: "hotspot",
      hotspotRegion: {
        x: row.hotspot_x ?? 0,
        y: row.hotspot_y ?? 0,
        width: row.hotspot_width ?? 0,
        height: row.hotspot_height ?? 0,
      },
    };
  }
  return { ...base, type: "choice", choices: row.choices, correctIndices: row.correct_indices ?? [] };
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
  // Both paginated via fetchAllRows (see src/lib/supabase.ts) -- a bare
  // .select() silently truncates at Supabase's default max-rows (1000)
  // once either table grows past it, with no error, so PLAY/FILTER would
  // just quietly stop seeing anything beyond whatever the cap happens to
  // be. Ordered by `id` (each table's own primary key) so the pagination
  // itself is stable across requests.
  const [data, gridRowAnswerData] = await Promise.all([
    fetchAllRows<QuestionRow>((from, to) =>
      supabase
        .from("questions")
        .select(
          "id, category, tags, question, choices, rationale, question_type, correct_indices, correct_order, grid_columns, " +
            "cloze_template, cloze_blanks(blank_index, cloze_blank_options(option_index, label, is_correct)), " +
            "bowtie_condition_choices, bowtie_condition_answer, bowtie_action_choices, bowtie_action_answer, " +
            "bowtie_monitor_choices, bowtie_monitor_answer, " +
            "hotspot_x, hotspot_y, hotspot_width, hotspot_height, " +
            "created_at, image_url, ai_generated, source",
        )
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<GridRowAnswerRow>((from, to) =>
      supabase
        .from("grid_row_answers")
        .select("question_id, row_index, column_index")
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const gridAnswersByQuestionId = groupGridRowAnswers(gridRowAnswerData);
  return data.map((row) => toQuestion(row, gridAnswersByQuestionId));
}

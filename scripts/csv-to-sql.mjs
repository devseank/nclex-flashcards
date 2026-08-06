// Converts a questions CSV into a SQL INSERT block, ready to paste into the
// Supabase SQL Editor. Rows whose `question` text already exists in the table
// are skipped via ON CONFLICT DO NOTHING (see supabase/schema.sql for the
// unique constraint this depends on).
//
// Expected CSV columns:
//   category, tags, image_url, question, choice_1, choice_2, ... (as many as
//   needed), correct_answer, rationale, question_type, correct_order,
//   grid_columns, ai_generated, source
//
// - category: exactly one, required -- the bounded "what kind of question"
//   grouping (Pharmacology, Prioritization, Maternal-Newborn, ...).
// - tags: zero or more freeform tags, NOT scoped to a single category --
//   the "what's it about" dimension (e.g. "Respiratory" can tag both a
//   Pharmacology question and a Prioritization question). Joined with " | "
//   if more than one. Leave blank if the question doesn't need any yet.
// - image_url: optional. A URL to an illustration for this question (e.g.
//   an anatomy diagram) -- typically a Supabase Storage public URL (see
//   supabase/schema.sql's `question-images` bucket). Reuse the exact same
//   URL across multiple rows when several questions share one image.
//   Leave blank for questions with no image.
// - choice_N: as many choice_1, choice_2, ... columns as the question needs.
//   Leave a cell blank if a given row doesn't use that many choices. For a
//   "grid" row, these are the row labels (findings/interventions), not
//   answer choices.
// - question_type: "choice" (default, leave blank), "sequence", or "grid".
// - For a "choice" row: correct_answer is one exact choice's text, or for a
//   "select all that apply" question, multiple choices joined with " | ".
//   correct_order/grid_columns are unused/blank.
// - For a "sequence" row (arrange the choices in the correct order, e.g.
//   steps of a procedure): correct_order lists the choice texts in their
//   correct order, joined with " | ". correct_answer/grid_columns are
//   unused/blank.
// - For a "grid" row (an NGN-style matrix, e.g. "Indicated"/"Not indicated"
//   per finding): grid_columns lists the column headers joined with " | "
//   (e.g. "Indicated | Not indicated"). correct_answer then lists, for each
//   row/choice_N IN ORDER, which of those column headers is correct for
//   that row, also joined with " | " -- so correct_answer always has
//   exactly as many " | "-separated entries as there are choice_N columns
//   used. correct_order is unused/blank.
// - ai_generated: "true" if the choices/rationale (or both) were written by
//   an AI rather than transcribed from the source -- shows a small badge in
//   the UI. Leave blank (defaults to false) for faithfully-transcribed
//   content, which is the normal case.
// - source: required. Which quiz-content batch/export this question came
//   from (e.g. "nurselabs", "naxlex") -- provenance only, not shown in the
//   app UI. No default -- every row must set this explicitly.
//
// Usage:
//   node scripts/csv-to-sql.mjs data/questions.csv > data/questions.sql
//
// Archiving (see data/AI_INSTRUCTIONS.md rule 9): once the bank grows large
// enough that the full INSERT is too big to paste into the Supabase SQL
// Editor in one go, older rows get split off into data/archived-NN.sql and
// a checkpoint file (data/archive-checkpoint.txt, gitignored -- just an
// integer) records how many rows are archived. With no --start/--end
// flags, this script always emits only the rows AFTER that checkpoint, so
// a plain re-run after appending new questions keeps questions.sql small
// (just the new stuff) instead of regenerating the whole multi-hundred-row
// file every time. --start/--end (1-indexed, inclusive, counting CSV data
// rows) override this to carve out an explicit archive slice, e.g.:
//   node scripts/csv-to-sql.mjs data/questions.csv --start=1 --end=150 > data/archived-01.sql

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);

const inputPath = args[0];
if (!inputPath) {
  console.error("Usage: node scripts/csv-to-sql.mjs <input.csv> [--start=N] [--end=M]");
  process.exit(1);
}

const csvText = readFileSync(inputPath, "utf-8");
const allRows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

const checkpointPath = join(dirname(inputPath), "archive-checkpoint.txt");
const checkpoint = existsSync(checkpointPath) ? Number(readFileSync(checkpointPath, "utf-8").trim()) || 0 : 0;

const startRow = flags.start ? Number(flags.start) : checkpoint + 1;
const endRow = flags.end ? Number(flags.end) : allRows.length;
const rows = allRows.slice(startRow - 1, endRow);

if (rows.length === 0) {
  console.error(`No rows in range [${startRow}, ${endRow}] (${allRows.length} total, ${checkpoint} already archived).`);
  console.log(`-- No new questions since last archive checkpoint (${checkpoint}/${allRows.length}).`);
  process.exit(0);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlTextArray(pipeDelimited) {
  const tags = String(pipeDelimited ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter((t) => t !== "");
  return `array[${tags.map(sqlString).join(",")}]::text[]`;
}

// Looks up each " | "-separated entry in `pipeDelimited` against `options`
// (either the row's own choices, for correct_answer/correct_order, or a
// grid's column headers, for a grid row's correct_answer) and returns the
// matching indices, in order. Used for all three of correct_answer,
// correct_order, and a grid's per-row correct_answer -- same shape of
// problem (human-readable label text -> index) in each case.
function matchLabelIndices(pipeDelimited, options, fieldName, row, rowNumber) {
  return pipeDelimited
    .split("|")
    .map((a) => a.trim())
    .map((answer) => {
      const idx = options.findIndex((o) => o.trim() === answer);
      if (idx === -1) {
        throw new Error(
          `Row ${rowNumber}: ${fieldName} "${answer}" does not exactly match any option. ` +
            `Question: "${row.question}"`,
        );
      }
      return idx;
    });
}

const values = rows.map((row, i) => {
  const rowNumber = startRow + i + 1; // +1 for the CSV header line
  const choices = Object.keys(row)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
    .map((key) => row[key])
    .filter((c) => c && c.trim() !== "");

  const questionType = row.question_type?.trim() || "choice";
  const choicesJson = JSON.stringify(choices);

  let correctIndicesSql = "null";
  let correctOrderSql = "null";
  let gridColumnsSql = "null";
  let gridAnswerSql = "null";

  if (questionType === "sequence") {
    const order = matchLabelIndices(row.correct_order, choices, "correct_order", row, rowNumber);
    correctOrderSql = `array[${order.join(",")}]`;
  } else if (questionType === "grid") {
    const gridColumns = String(row.grid_columns ?? "")
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (gridColumns.length === 0) {
      throw new Error(`Row ${rowNumber}: "grid" question is missing grid_columns. Question: "${row.question}"`);
    }
    const answerIndices = matchLabelIndices(row.correct_answer, gridColumns, "grid correct_answer", row, rowNumber);
    if (answerIndices.length !== choices.length) {
      throw new Error(
        `Row ${rowNumber}: grid correct_answer has ${answerIndices.length} entries but there are ${choices.length} rows (choice_N columns). ` +
          `Question: "${row.question}"`,
      );
    }
    gridColumnsSql = sqlTextArray(gridColumns.join(" | "));
    gridAnswerSql = `array[${answerIndices.join(",")}]`;
  } else {
    const indices = matchLabelIndices(row.correct_answer, choices, "correct_answer", row, rowNumber);
    correctIndicesSql = `array[${indices.join(",")}]`;
  }

  const imageUrlSql = row.image_url && row.image_url.trim() !== "" ? sqlString(row.image_url.trim()) : "null";
  const aiGeneratedSql = row.ai_generated?.trim().toLowerCase() === "true" ? "true" : "false";

  const source = row.source?.trim();
  if (!source) {
    throw new Error(`Row ${rowNumber}: missing required "source". Question: "${row.question}"`);
  }

  return (
    `(${sqlString(row.category)}, ${sqlTextArray(row.tags)}, ${sqlString(row.question)}, ${sqlString(choicesJson)}::jsonb, ` +
    `${sqlString(questionType)}, ${correctIndicesSql}, ${correctOrderSql}, ${gridColumnsSql}, ${gridAnswerSql}, ` +
    `${sqlString(row.rationale)}, ${imageUrlSql}, ${aiGeneratedSql}, ${sqlString(source)})`
  );
});

console.error(`Generated ${values.length} row(s) (CSV rows ${startRow}-${endRow} of ${allRows.length}).`);

console.log(
  `insert into public.questions (category, tags, question, choices, question_type, correct_indices, correct_order, grid_columns, grid_answer, rationale, image_url, ai_generated, source)\nvalues\n  ${values.join(",\n  ")}\non conflict (question) do nothing;`,
);

// Converts a questions CSV into a SQL INSERT block, ready to paste into the
// Supabase SQL Editor. Rows whose `question` text already exists in the table
// are skipped via ON CONFLICT DO NOTHING (see supabase/schema.sql for the
// unique constraint this depends on).
//
// Expected CSV columns:
//   category, question, choice_1, choice_2, ... (as many as needed),
//   correct_answer, rationale, question_type, correct_order
//
// - choice_N: as many choice_1, choice_2, ... columns as the question needs.
//   Leave a cell blank if a given row doesn't use that many choices.
// - question_type: "choice" (default, leave blank) or "sequence".
// - For a "choice" row: correct_answer is one exact choice's text, or for a
//   "select all that apply" question, multiple choices joined with " | ".
//   correct_order is unused/blank.
// - For a "sequence" row (arrange the choices in the correct order, e.g.
//   steps of a procedure): correct_order lists the choice texts in their
//   correct order, joined with " | ". correct_answer is unused/blank.
//
// Usage:
//   node scripts/csv-to-sql.mjs data/questions.csv > data/questions.sql

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/csv-to-sql.mjs <input.csv>");
  process.exit(1);
}

const csvText = readFileSync(inputPath, "utf-8");
const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function matchChoiceIndices(pipeDelimited, choices, fieldName, row, rowNumber) {
  return pipeDelimited
    .split("|")
    .map((a) => a.trim())
    .map((answer) => {
      const idx = choices.findIndex((c) => c.trim() === answer);
      if (idx === -1) {
        throw new Error(
          `Row ${rowNumber}: ${fieldName} "${answer}" does not exactly match any choice. ` +
            `Question: "${row.question}"`,
        );
      }
      return idx;
    });
}

const values = rows.map((row, i) => {
  const rowNumber = i + 2;
  const choices = Object.keys(row)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
    .map((key) => row[key])
    .filter((c) => c && c.trim() !== "");

  const questionType = row.question_type?.trim() || "choice";
  const choicesJson = JSON.stringify(choices);

  let correctIndicesSql = "null";
  let correctOrderSql = "null";

  if (questionType === "sequence") {
    const order = matchChoiceIndices(row.correct_order, choices, "correct_order", row, rowNumber);
    correctOrderSql = `array[${order.join(",")}]`;
  } else {
    const indices = matchChoiceIndices(row.correct_answer, choices, "correct_answer", row, rowNumber);
    correctIndicesSql = `array[${indices.join(",")}]`;
  }

  return (
    `(${sqlString(row.category)}, ${sqlString(row.question)}, ${sqlString(choicesJson)}::jsonb, ` +
    `${sqlString(questionType)}, ${correctIndicesSql}, ${correctOrderSql}, ${sqlString(row.rationale)})`
  );
});

if (values.length === 0) {
  console.error("No rows found in CSV.");
  process.exit(1);
}

console.log(
  `insert into public.questions (category, question, choices, question_type, correct_indices, correct_order, rationale)\nvalues\n  ${values.join(",\n  ")}\non conflict (question) do nothing;`,
);

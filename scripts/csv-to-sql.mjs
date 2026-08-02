// Converts a questions CSV into a SQL INSERT block, ready to paste into the
// Supabase SQL Editor. Rows whose `question` text already exists in the table
// are skipped via ON CONFLICT DO NOTHING (see supabase/schema.sql for the
// unique constraint this depends on).
//
// Expected CSV columns:
//   category, question, choice_1, choice_2, choice_3, choice_4, choice_5, correct_answer, rationale
//
// - choice_5 (and beyond) is optional — leave blank unless a question has
//   more than 4 choices.
// - correct_answer is normally one exact choice's text. For a "select all
//   that apply" question, separate multiple correct choices with " | ".
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

const values = rows.map((row, i) => {
  const choices = Object.keys(row)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
    .map((key) => row[key])
    .filter((c) => c && c.trim() !== "");

  const correctAnswers = row.correct_answer.split("|").map((a) => a.trim());
  const correctIndices = correctAnswers.map((answer) => {
    const idx = choices.findIndex((c) => c.trim() === answer);
    if (idx === -1) {
      throw new Error(
        `Row ${i + 2}: correct_answer "${answer}" does not exactly match any choice. ` +
          `Question: "${row.question}"`,
      );
    }
    return idx;
  });

  const choicesJson = JSON.stringify(choices);

  return `(${sqlString(row.category)}, ${sqlString(row.question)}, ${sqlString(choicesJson)}::jsonb, array[${correctIndices.join(",")}], ${sqlString(row.rationale)})`;
});

if (values.length === 0) {
  console.error("No rows found in CSV.");
  process.exit(1);
}

console.log(
  `insert into public.questions (category, question, choices, correct_indices, rationale)\nvalues\n  ${values.join(",\n  ")}\non conflict (question) do nothing;`,
);

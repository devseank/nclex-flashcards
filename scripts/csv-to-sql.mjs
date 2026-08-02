// Converts a questions CSV into a SQL INSERT block, ready to paste into the
// Supabase SQL Editor. Rows whose `question` text already exists in the table
// are skipped via ON CONFLICT DO NOTHING (see supabase/schema.sql for the
// unique constraint this depends on).
//
// Expected CSV columns:
//   category, question, choice_1, choice_2, choice_3, choice_4, correct_answer, rationale
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
  const choices = [row.choice_1, row.choice_2, row.choice_3, row.choice_4];
  const correctIndex = choices.findIndex((c) => c.trim() === row.correct_answer.trim());

  if (correctIndex === -1) {
    throw new Error(
      `Row ${i + 2}: correct_answer "${row.correct_answer}" does not exactly match any of choice_1..4. ` +
        `Question: "${row.question}"`,
    );
  }

  const choicesJson = JSON.stringify(choices);

  return `(${sqlString(row.category)}, ${sqlString(row.question)}, ${sqlString(choicesJson)}::jsonb, ${correctIndex}, ${sqlString(row.rationale)})`;
});

if (values.length === 0) {
  console.error("No rows found in CSV.");
  process.exit(1);
}

console.log(
  `insert into public.questions (category, question, choices, correct_index, rationale)\nvalues\n  ${values.join(",\n  ")}\non conflict (question) do nothing;`,
);

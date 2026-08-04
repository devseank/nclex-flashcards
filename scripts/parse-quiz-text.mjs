// Parses a copy-pasted quiz page (numbered questions, A-I choices, a
// "Correct Answer(s):" line, then "* Option X: ..." rationale bullets) into
// a CSV matching data/questions.template.csv's column format.
//
// "Reorder" (drag-and-drop step-ordering) questions can't be parsed
// automatically — the correct order only exists as prose in the rationale,
// not as structured data in the pasted text. Those are skipped and reported
// so they can be hand-built as question_type=sequence rows separately.
//
// Usage:
//   node scripts/parse-quiz-text.mjs <input.txt> <output.csv> [category]

import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath, category = "Prioritization"] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/parse-quiz-text.mjs <input.txt> <output.csv> [category]");
  process.exit(1);
}

const raw = readFileSync(inputPath, "utf-8");

const NOISE_LINES = new Set(["Correct", "Incorrect", "Correct answer", "Incorrect answer", "1 point(s)"]);
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const blocks = raw
  .split(/\n(?=\d+\.\s\d+\.\sQuestion\n)/)
  .map((b) => b.trim())
  .filter(Boolean);

function csvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

const rows = [];
const skipped = [];

for (const block of blocks) {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE_LINES.has(l));

  if (lines.some((l) => l === "Reorder" || l === "View Answers:")) {
    const questionLine = lines.find((l) => !/^\d+\.\s\d+\.\sQuestion$/.test(l)) ?? lines[0];
    skipped.push({ reason: "sequence/reorder question — needs manual question_type=sequence row", preview: questionLine.slice(0, 80) });
    continue;
  }

  let idx = 1;
  const questionLines = [];
  while (idx < lines.length && !/^[A-I]\.\s/.test(lines[idx])) {
    questionLines.push(lines[idx]);
    idx++;
  }
  const question = questionLines.join(" ").trim();

  const choices = {};
  while (idx < lines.length && !/^(Correct Answers?|Answer):/.test(lines[idx])) {
    const m = lines[idx].match(/^([A-I])\.\s(.+)$/);
    if (m && !(m[1] in choices)) choices[m[1]] = m[2].trim();
    idx++;
  }

  const answerLine = lines[idx];
  const answerMatch = answerLine?.match(/^(?:Correct Answers?|Answer):\s*((?:[A-I]\b[,\s]*(?:and\s+)?)+)/);
  if (!answerMatch) {
    skipped.push({ reason: "couldn't find a parseable answer line", preview: question.slice(0, 80) });
    continue;
  }
  const correctLetters = [...new Set(answerMatch[1].match(/[A-I]/g) ?? [])];
  idx++;

  const rationale = lines
    .slice(idx)
    .map((l) => l.replace(/^\*\s*/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const choiceTexts = CHOICE_LETTERS.map((l) => choices[l]).filter(Boolean);
  const correctAnswers = correctLetters.map((l) => choices[l]);

  if (choiceTexts.length < 2 || correctAnswers.some((a) => !a) || !question) {
    skipped.push({ reason: "incomplete parse (choices/answer/question missing)", preview: question.slice(0, 80) });
    continue;
  }

  rows.push({ category, question, choices: choiceTexts, correctAnswer: correctAnswers.join(" | "), rationale });
}

// Floor of 9 matches data/questions.csv's current header (set by its widest
// existing question) — appended rows must have the same column count as
// the file they're appended to, not just whatever this batch happens to need.
const maxChoices = Math.max(9, ...rows.map((r) => r.choices.length));
const choiceColumns = Array.from({ length: maxChoices }, (_, i) => `choice_${i + 1}`);
const header = ["category", "question", ...choiceColumns, "correct_answer", "rationale", "question_type", "correct_order"].join(",");

const csvRows = rows.map((r) => {
  const padded = [...r.choices];
  while (padded.length < maxChoices) padded.push("");
  return [r.category, r.question, ...padded, r.correctAnswer, r.rationale, "", ""].map(csvField).join(",");
});

writeFileSync(outputPath, [header, ...csvRows].join("\n") + "\n");

console.log(`Parsed ${rows.length} question(s) -> ${outputPath}`);
if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length} block(s):`);
  for (const s of skipped) console.log(`  - ${s.reason}: "${s.preview}..."`);
}

// Converts a questions CSV into SQL, ready to paste into the Supabase SQL
// Editor. Rows whose `question` text already exists in the table are
// skipped via ON CONFLICT DO NOTHING (see supabase/schema.sql for the
// unique constraint this depends on). See data/AI_INSTRUCTIONS.md rule 5
// for the full per-question_type authoring reference (this comment block
// is the mechanical/script-level summary of the same mapping).
//
// Expected CSV columns:
//   category, tags, image_url, question, choice_1, choice_2, ... (as many as
//   needed), correct_answer, rationale, question_type, correct_order,
//   grid_columns, cloze_template, blank_1_options, blank_1_correct, ...,
//   bowtie_condition_choices, bowtie_condition_answer, bowtie_action_choices,
//   bowtie_action_answer, bowtie_monitor_choices, bowtie_monitor_answer,
//   ai_generated, source
//
// - category: exactly one, required -- the bounded "what kind of question"
//   grouping (Pharmacology, Prioritization, Maternal-Newborn, ...). ->
//   questions.category (text).
// - tags: zero or more freeform tags, NOT scoped to a single category --
//   the "what's it about" dimension (e.g. "Respiratory" can tag both a
//   Pharmacology question and a Prioritization question). Joined with " | "
//   if more than one. Leave blank if the question doesn't need any yet. ->
//   questions.tags (text[]).
// - image_url: optional. A URL to an illustration for this question (e.g.
//   an anatomy diagram) -- typically a Supabase Storage public URL (see
//   supabase/schema.sql's `question-images` bucket). Reuse the exact same
//   URL across multiple rows when several questions share one image.
//   Leave blank for questions with no image. -> questions.image_url (text).
// - choice_N: as many choice_1, choice_2, ... columns as the question needs.
//   Leave a cell blank if a given row doesn't use that many choices. For a
//   "grid" row, these are the row labels (findings/interventions), not
//   answer choices. Unused/blank for "cloze" (see below). -> collected
//   into questions.choices (jsonb array), choice_N's own column position is
//   NOT stored -- only the resulting array order matters, which is why
//   gaps must not be left between used choice_N columns.
// - question_type: "choice" (default, leave blank), "sequence", "grid",
//   "cloze", or "bowtie". -> questions.question_type (text).
// - question: required for every type EXCEPT "cloze", where it's left
//   blank -- it's derived instead (see below) so the sentence is only ever
//   maintained in one place. For "bowtie", `question` is the one shared
//   stem all three sections branch off of -- authored normally.
//
// Per question_type, exactly one of correct_answer/correct_order/
// grid_columns+grid-row-answer-data/cloze_template+blank_N-data/
// bowtie_*-data is populated -- the others are left unused/blank on that
// row:
//
// - "choice": correct_answer is one exact choice's text, or for a "select
//   all that apply" question, multiple choices joined with " | ".
//   -> matched against `choices` and stored as questions.correct_indices
//   (integer[]). correct_order/grid_columns/cloze_* unused.
// - "sequence" (arrange the choices in the correct order, e.g. steps of a
//   procedure): correct_order lists the choice texts in their correct
//   order, joined with " | ". -> matched against `choices` and stored as
//   questions.correct_order (integer[], a permutation of choices' indices).
//   correct_answer/grid_columns/cloze_* unused.
// - "grid" (an NGN-style matrix, e.g. "Indicated"/"Not indicated" per
//   finding, single- OR multiple-response): grid_columns lists the column
//   headers joined with " | " (e.g. "Indicated | Not indicated") ->
//   questions.grid_columns (text[]). correct_answer then lists, for each
//   row/choice_N IN ORDER, which of those column headers is correct for
//   that row, joined with " | " between rows -- so correct_answer always
//   has exactly as many " | "-separated entries as there are choice_N rows.
//   When a single row has MORE THAN ONE correct column (matrix multiple-
//   response), join that row's own entry with " & " instead, e.g. for two
//   rows: "Notify provider & Initiate fall precautions | Document only".
//   Each (row, correct column) pair is matched against grid_columns and
//   emitted as one row in a SEPARATE insert into the grid_row_answers
//   child table (not a questions column -- a row's correct-column set is
//   variable-length, which a plain array column can't hold without being
//   rectangular), joined back to the just-inserted question by its unique
//   `question` text. correct_order/cloze_* unused.
// - "cloze" (a sentence with one or more dropdown blanks): cloze_template
//   is the sentence itself, blanks marked {{1}}, {{2}}, ... in reading
//   order -> questions.cloze_template (text). Each {{n}} marker needs a
//   matching pair of columns, 1-indexed: blank_N_options (that blank's own
//   dropdown choices, joined with " | ") and blank_N_correct (the exact
//   text of the correct one, must appear verbatim in blank_N_options).
//   Each blank is matched against its own options and emitted as rows in
//   two SEPARATE inserts into the cloze_blanks/cloze_blank_options child
//   tables (not questions columns -- a variable number of blanks, each
//   with a variable number of options, same reasoning as grid_row_answers
//   above), joined back by the derived `question` text. `question` itself
//   is DERIVED from cloze_template (each {{n}} replaced with "_____") --
//   leave the CSV's own `question` cell blank for cloze rows.
//   choice_N/correct_answer/correct_order/grid_columns unused.
// - "bowtie" (one shared stem branching into 3 independent sections --
//   condition, actions, monitor): bowtie_condition_choices/
//   bowtie_action_choices/bowtie_monitor_choices each list that section's
//   own options, pipe-delimited -> questions.bowtie_{condition,action,
//   monitor}_choices (text[]). bowtie_condition_answer is the ONE exact
//   correct choice's text (condition is single-pick) ->
//   questions.bowtie_condition_answer (integer). bowtie_action_answer/
//   bowtie_monitor_answer are each EXACTLY TWO correct choices joined with
//   " | " (both sections are pick-2) -> questions.bowtie_{action,monitor}_
//   answer (integer[]) -- csv-to-sql.mjs throws if either doesn't resolve
//   to exactly 2. choice_N/correct_answer/correct_order/grid_columns/
//   cloze_* unused.
// - ai_generated: "true" if the choices/rationale (or both) were written by
//   an AI rather than transcribed from the source -- shows a small badge in
//   the UI. Leave blank (defaults to false) for faithfully-transcribed
//   content, which is the normal case. -> questions.ai_generated (boolean).
// - source: required. Which quiz-content batch/export this question came
//   from (e.g. "nurselabs", "naxlex") -- provenance only, not shown in the
//   app UI. No default -- every row must set this explicitly. ->
//   questions.source (text).
//
// Usage:
//   node scripts/csv-to-sql.mjs data/questions.csv > data/questions.sql
//
// Output: one `insert into public.questions (...) values ...` statement,
// followed by however many of these apply to the batch (in this order,
// each only emitted if at least one row of that type is present):
//   - `insert into public.grid_row_answers (...) select ... from public.
//     questions join (values ...) ...` for grid rows
//   - `insert into public.cloze_blanks (...) select ...` then
//     `insert into public.cloze_blank_options (...) select ...` for cloze
//     rows (the second joins through the first, since a blank's own id
//     isn't known until its own insert has run either)
// All of these look the just-inserted questions (or blanks) back up by
// their unique text, since no numeric id is known until the row it belongs
// to has actually been inserted. Paste every statement into the SQL Editor
// together, in the order printed.
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

// Parses one bowtie section's own choices + correct answer(s) -- shared by
// condition (expectedCount=1)/actions/monitor (expectedCount=2), since all
// three sections are otherwise identical in shape.
function parseBowtieSection(row, rowNumber, questionText, prefix, expectedCount) {
  const choices = String(row[`bowtie_${prefix}_choices`] ?? "")
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  if (choices.length === 0) {
    throw new Error(`Row ${rowNumber}: "bowtie" question is missing bowtie_${prefix}_choices. Question: "${questionText}"`);
  }
  const answerIndices = matchLabelIndices(
    row[`bowtie_${prefix}_answer`],
    choices,
    `bowtie_${prefix}_answer`,
    { question: questionText },
    rowNumber,
  );
  if (answerIndices.length !== expectedCount) {
    throw new Error(
      `Row ${rowNumber}: bowtie_${prefix}_answer has ${answerIndices.length} pick(s), expected exactly ${expectedCount}. ` +
        `Question: "${questionText}"`,
    );
  }
  return { choicesSql: sqlTextArray(choices.join(" | ")), answerIndices };
}

// (question text, row_index, column_index) triples for every grid row's
// correct cell across the whole batch -- collected here (a side effect of
// the main values.map below) since it's emitted as a second, separate
// insert into grid_row_answers, joined back by the row's unique `question`
// text rather than by numeric id (which isn't known until the questions
// insert below has actually run).
const gridRowAnswers = [];

// (question text, blank_index) pairs and (question text, blank_index,
// option_index, label, is_correct) rows for every cloze question's blanks
// -- same join-back-by-question-text idiom as gridRowAnswers above, just
// one level deeper (cloze_blank_options joins through cloze_blanks, which
// itself joins through questions).
const clozeBlanks = [];
const clozeBlankOptions = [];

const values = rows.map((row, i) => {
  const rowNumber = startRow + i + 1; // +1 for the CSV header line
  const choices = Object.keys(row)
    .filter((key) => /^choice_\d+$/.test(key))
    .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
    .map((key) => row[key])
    .filter((c) => c && c.trim() !== "");

  const questionType = row.question_type?.trim() || "choice";

  // The unique `question` text is normally authored directly -- except for
  // "cloze", where it's derived from cloze_template (blanks replaced with
  // "_____") so the sentence is only ever maintained in one place.
  let questionText = row.question;

  const choicesJson = JSON.stringify(choices);

  let correctIndicesSql = "null";
  let correctOrderSql = "null";
  let gridColumnsSql = "null";
  let clozeTemplateSql = "null";
  let bowtieConditionChoicesSql = "null";
  let bowtieConditionAnswerSql = "null";
  let bowtieActionChoicesSql = "null";
  let bowtieActionAnswerSql = "null";
  let bowtieMonitorChoicesSql = "null";
  let bowtieMonitorAnswerSql = "null";

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
    // One " | "-separated entry per row (same count as choice_N columns),
    // each entry itself " & "-separated when that row has more than one
    // correct column (matrix multiple-response) -- e.g. for two rows,
    // "Notify provider & Initiate fall precautions | Document only".
    const rowEntries = String(row.correct_answer ?? "").split("|").map((s) => s.trim());
    if (rowEntries.length !== choices.length) {
      throw new Error(
        `Row ${rowNumber}: grid correct_answer has ${rowEntries.length} entries but there are ${choices.length} rows (choice_N columns). ` +
          `Question: "${row.question}"`,
      );
    }
    rowEntries.forEach((entry, rowIndex) => {
      const columnIndices = matchLabelIndices(
        entry.replace(/&/g, "|"),
        gridColumns,
        `grid correct_answer (row ${rowIndex + 1})`,
        row,
        rowNumber,
      );
      columnIndices.forEach((columnIndex) => gridRowAnswers.push([questionText, rowIndex, columnIndex]));
    });
    gridColumnsSql = sqlTextArray(gridColumns.join(" | "));
  } else if (questionType === "cloze") {
    const clozeTemplate = row.cloze_template?.trim();
    if (!clozeTemplate) {
      throw new Error(`Row ${rowNumber}: "cloze" question is missing cloze_template.`);
    }

    const markerCount = (clozeTemplate.match(/\{\{\d+\}\}/g) ?? []).length;
    const blankKeys = Object.keys(row)
      .filter((key) => /^blank_\d+_options$/.test(key))
      .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]));
    if (blankKeys.length !== markerCount) {
      throw new Error(
        `Row ${rowNumber}: cloze_template has ${markerCount} {{n}} marker(s) but ${blankKeys.length} blank_N_options column(s) were found. ` +
          `Template: "${clozeTemplate}"`,
      );
    }

    // `question` (the unique dedup column) is derived from the template,
    // not hand-authored -- authors only maintain the sentence once.
    questionText = clozeTemplate.replace(/\{\{\d+\}\}/g, "_____");

    blankKeys.forEach((optionsKey, blankIndex) => {
      const n = optionsKey.split("_")[1];
      const options = String(row[optionsKey] ?? "")
        .split("|")
        .map((o) => o.trim())
        .filter((o) => o !== "");
      if (options.length === 0) {
        throw new Error(`Row ${rowNumber}: blank_${n}_options is empty. Question: "${questionText}"`);
      }
      const correctIndex = matchLabelIndices(
        row[`blank_${n}_correct`],
        options,
        `blank_${n}_correct`,
        { question: questionText },
        rowNumber,
      )[0];

      clozeBlanks.push([questionText, blankIndex]);
      options.forEach((label, optionIndex) => {
        clozeBlankOptions.push([questionText, blankIndex, optionIndex, label, optionIndex === correctIndex]);
      });
    });

    clozeTemplateSql = sqlString(clozeTemplate);
  } else if (questionType === "bowtie") {
    const condition = parseBowtieSection(row, rowNumber, questionText, "condition", 1);
    const actions = parseBowtieSection(row, rowNumber, questionText, "action", 2);
    const monitor = parseBowtieSection(row, rowNumber, questionText, "monitor", 2);

    bowtieConditionChoicesSql = condition.choicesSql;
    bowtieConditionAnswerSql = String(condition.answerIndices[0]);
    bowtieActionChoicesSql = actions.choicesSql;
    bowtieActionAnswerSql = `array[${actions.answerIndices.join(",")}]`;
    bowtieMonitorChoicesSql = monitor.choicesSql;
    bowtieMonitorAnswerSql = `array[${monitor.answerIndices.join(",")}]`;
  } else {
    const indices = matchLabelIndices(row.correct_answer, choices, "correct_answer", row, rowNumber);
    correctIndicesSql = `array[${indices.join(",")}]`;
  }

  const imageUrlSql = row.image_url && row.image_url.trim() !== "" ? sqlString(row.image_url.trim()) : "null";
  const aiGeneratedSql = row.ai_generated?.trim().toLowerCase() === "true" ? "true" : "false";

  const source = row.source?.trim();
  if (!source) {
    throw new Error(`Row ${rowNumber}: missing required "source". Question: "${questionText}"`);
  }

  return (
    `(${sqlString(row.category)}, ${sqlTextArray(row.tags)}, ${sqlString(questionText)}, ${sqlString(choicesJson)}::jsonb, ` +
    `${sqlString(questionType)}, ${correctIndicesSql}, ${correctOrderSql}, ${gridColumnsSql}, ${clozeTemplateSql}, ` +
    `${bowtieConditionChoicesSql}, ${bowtieConditionAnswerSql}, ${bowtieActionChoicesSql}, ${bowtieActionAnswerSql}, ` +
    `${bowtieMonitorChoicesSql}, ${bowtieMonitorAnswerSql}, ` +
    `${sqlString(row.rationale)}, ${imageUrlSql}, ${aiGeneratedSql}, ${sqlString(source)})`
  );
});

console.error(`Generated ${values.length} row(s) (CSV rows ${startRow}-${endRow} of ${allRows.length}).`);
if (gridRowAnswers.length > 0) {
  console.error(`  ...including ${gridRowAnswers.length} grid_row_answers cell(s) across the grid rows above.`);
}
if (clozeBlanks.length > 0) {
  console.error(`  ...including ${clozeBlanks.length} cloze blank(s) (${clozeBlankOptions.length} option(s)) across the cloze rows above.`);
}

console.log(
  `insert into public.questions (category, tags, question, choices, question_type, correct_indices, correct_order, grid_columns, cloze_template, bowtie_condition_choices, bowtie_condition_answer, bowtie_action_choices, bowtie_action_answer, bowtie_monitor_choices, bowtie_monitor_answer, rationale, image_url, ai_generated, source)\nvalues\n  ${values.join(",\n  ")}\non conflict (question) do nothing;`,
);

// A separate insert, joined back to the row(s) just inserted above by their
// unique `question` text -- the numeric id isn't known until that insert
// has actually run, so it can't be embedded directly into the values here.
if (gridRowAnswers.length > 0) {
  const gridRowAnswerValues = gridRowAnswers
    .map(([question, rowIndex, columnIndex]) => `  (${sqlString(question)}, ${rowIndex}, ${columnIndex})`)
    .join(",\n");
  console.log(
    `\ninsert into public.grid_row_answers (question_id, row_index, column_index)\n` +
      `select q.id, v.row_index, v.column_index\n` +
      `from public.questions q\n` +
      `join (values\n${gridRowAnswerValues}\n) as v(question_text, row_index, column_index)\n` +
      `  on q.question = v.question_text\n` +
      `on conflict (question_id, row_index, column_index) do nothing;`,
  );
}

// Two more separate inserts for cloze rows -- cloze_blanks joins back to
// questions by unique question text (like grid_row_answers above);
// cloze_blank_options joins one level deeper still, through cloze_blanks,
// since a blank's own numeric id isn't known until ITS insert has run
// either. Both must be pasted in order, after the questions insert above.
if (clozeBlanks.length > 0) {
  const clozeBlankValues = clozeBlanks
    .map(([question, blankIndex]) => `  (${sqlString(question)}, ${blankIndex})`)
    .join(",\n");
  console.log(
    `\ninsert into public.cloze_blanks (question_id, blank_index)\n` +
      `select q.id, v.blank_index\n` +
      `from public.questions q\n` +
      `join (values\n${clozeBlankValues}\n) as v(question_text, blank_index)\n` +
      `  on q.question = v.question_text\n` +
      `on conflict (question_id, blank_index) do nothing;`,
  );

  const clozeBlankOptionValues = clozeBlankOptions
    .map(
      ([question, blankIndex, optionIndex, label, isCorrect]) =>
        `  (${sqlString(question)}, ${blankIndex}, ${optionIndex}, ${sqlString(label)}, ${isCorrect})`,
    )
    .join(",\n");
  console.log(
    `\ninsert into public.cloze_blank_options (blank_id, option_index, label, is_correct)\n` +
      `select cb.id, v.option_index, v.label, v.is_correct\n` +
      `from public.cloze_blanks cb\n` +
      `join public.questions q on q.id = cb.question_id\n` +
      `join (values\n${clozeBlankOptionValues}\n) as v(question_text, blank_index, option_index, label, is_correct)\n` +
      `  on q.question = v.question_text and cb.blank_index = v.blank_index\n` +
      `on conflict (blank_id, option_index) do nothing;`,
  );
}

# Instructions for AI agents working in this folder

This folder holds the growing NCLEX question bank. `data/questions.csv` and
`data/questions.sql` are gitignored (private, real study content) —
`data/questions.template.csv` and this file are the only tracked exceptions.

## Rules

1. **If the user pastes raw quiz text (not already in CSV form), parse it
   first instead of hand-transcribing it.** `scripts/parse-quiz-text.mjs`
   understands one specific pasted format: numbered questions, `A.`-`I.`
   choices, a `Correct Answer(s):` line, then `* Option X: ...` rationale
   bullets (the shape most copy-pasted quiz-bank pages come in). Write the
   pasted text to a temp file and run:
   ```
   node scripts/parse-quiz-text.mjs <input.txt> <output.csv> [category]
   ```
   `category` defaults to `Prioritization` if omitted — pass the right one
   for the batch. Read the script's own console output afterward: it
   reports how many questions it parsed and lists every block it *skipped*
   (with a reason) rather than guessing at malformed input. Two skip
   reasons are expected and not bugs:
   - **Reorder/sequence questions** — the correct order only exists as
     prose in the rationale, not as structured data in the pasted text, so
     these are always skipped. Build them by hand as `question_type=sequence`
     rows per rule 5 below.
   - **Unparseable blocks** — anything that doesn't match the expected
     shape (missing answer line, fewer than 2 choices, etc.). Tell the user
     which questions were skipped and why; don't silently drop them.
   The script's CSV output still needs to be *appended* into
   `data/questions.csv` per rule 3 below — it's a formatting step, not a
   replacement for the append/never-edit-existing-rows rule.
2. **Self-verify the parser's output before appending anything — a clean
   run (no skipped blocks) is not proof the parse was correct.** The parser
   can silently misparse rows that don't hit its error paths: a choice line
   that looks like `E. ...` but is actually a continuation of choice D's
   text, a `Correct Answer(s): B` line where B is the *wrong* choice per the
   source's own rationale, a rationale bullet that got attached to the
   wrong choice index. Before appending, open the generated CSV and check,
   for *every* row it produced:
   - The question text reads as a complete sentence/stem, not truncated or
     missing a leading fragment.
   - Every choice column has real, distinct choice text (not empty, not a
     duplicate of another choice, not a rationale fragment that leaked in).
   - `correct_answer` names a choice that is (a) present verbatim in one of
     the `choice_N` columns and (b) actually the one marked correct in the
     source text — don't just trust the parser found *an* answer, confirm
     it found the *right* one by re-reading the source's own answer key for
     that question.
   - The rationale reads coherently and its per-option sentences line up
     with the choice they're explaining.
   If anything looks off, fix that row by hand (or re-parse after adjusting
   the input) rather than appending it as-is — a wrong `correct_answer` is
   worse than a skipped question, since it teaches the wrong thing silently.
3. **Only append.** When adding new questions, add new rows to the end of
   `data/questions.csv`. Never edit, reorder, or delete existing rows.
4. **Never "fix" existing content while appending.** If an existing
   question/rationale/choice looks wrong, flag it to the user and ask —
   don't silently rewrite it as a side effect of an unrelated append.
5. **Match the column format exactly** — see `data/questions.template.csv`:
   `category,question,choice_1,choice_2,...,correct_answer,rationale,question_type,correct_order`
   - `choice_N`: add as many `choice_1`, `choice_2`, ... columns as the
     question needs (the parser reads however many `choice_N` columns exist
     in the header). Leave a cell blank for rows that use fewer.
   - `question_type`: leave blank for a normal multiple-choice / select-all-
     that-apply question (defaults to `choice`). Set to `sequence` for a
     "put these steps in the correct order" question.
   - For a `choice` row: `correct_answer` is one exact choice's text, or for
     "select all that apply", multiple choices joined with ` | `
     (space-pipe-space). `correct_order` is unused/blank.
   - For a `sequence` row: `correct_order` lists the choice texts in their
     correct order, joined with ` | `. `correct_answer` is unused/blank.
   - Question types NOT in this list (e.g. matrix/grid, fill-in-the-blank,
     hot-spot/image-click) still aren't supported — skip those and tell the
     user which ones were skipped and why, same as before.
6. **After appending, regenerate the SQL from the *entire* file**, not just
   the new rows:
   ```
   node scripts/csv-to-sql.mjs data/questions.csv > data/questions.sql
   ```
   This is always safe to re-run on the full file — the generated SQL uses
   `on conflict (question) do nothing`, so already-imported questions are
   automatically skipped and only genuinely new rows get inserted when the
   user pastes it into the Supabase SQL Editor.
7. **Validate the regenerated SQL before handing it back**, not just the
   CSV: confirm the file has one `insert` per new question (row count
   matches what you appended), that string values are properly quoted/
   escaped (a stray apostrophe in a question or rationale can break a SQL
   string literal if it wasn't escaped), and that `question_type`/
   `correct_order` came through as `NULL`/array literals correctly for
   sequence rows rather than empty strings. This is the artifact the user
   pastes directly into the Supabase SQL Editor — a malformed statement
   fails loudly there, but a *malformed value* (wrong answer, mis-escaped
   quote that shifts columns) can succeed silently and corrupt data.
8. **Never commit `questions.csv` or `questions.sql`.** They're gitignored
   on purpose — some source content may be copyrighted, and this data is for
   local/private use only. Don't remove the `.gitignore` exceptions for them.

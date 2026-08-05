# Instructions for AI agents working in this folder

This folder holds the growing NCLEX question bank. `data/questions.csv`,
`data/questions.sql`, and `data/updates.sql` are gitignored (private, real
study content) — `data/questions.template.csv` and this file are the only
tracked exceptions.

Two SQL files, two different jobs — don't blend them:
- **`data/questions.sql`** is a pure, mechanical 1:1 mirror of
  `data/questions.csv`, regenerated in full by
  `scripts/csv-to-sql.mjs` (rule 6). Every row is an `insert`. Never
  hand-edit it and never add `update`/one-off statements to it — if you
  need those, they go in `updates.sql` instead.
- **`data/updates.sql`** holds `update` statements and any other
  miscellaneous one-off SQL that isn't "insert this CSV's rows" — e.g.
  backfilling a new column on rows that already exist, fixing a
  miscategorized row, other data corrections. Unlike `questions.sql`, this
  one *is* hand-authored/accumulated over time, not mechanically
  regenerated from the CSV. Match `question` (the unique column) in the
  `where` clause so it's safe to paste in more than once.

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
   - `category` (the CLI arg you passed) actually fits every question in the
     batch — a source page's own title is a starting guess, not a
     guarantee, and some pages mix topics. Check it against categories
     already in the file (`cut -d',' -f1 data/questions.csv | sort -u`) and
     reuse an exact match; only introduce a new category name if the batch
     genuinely doesn't fit any existing one.
   - `tags` got filled in, not left blank. The parser always emits an empty
     `tags` column — it has no way to infer subject tags from the pasted
     text, so this is on you. Read each question and add whichever existing
     tags apply (check what's already in use per rule 5 below; reuse exact
     spelling/casing), pipe-delimited if more than one. Leave a row's tags
     blank only if it genuinely doesn't fit any tag worth having, not by
     default.
   - if the pasted question refers to an image ("refer to the image below",
     a diagram, an illustration), that content can't come from plain pasted
     text — flag it to the user rather than silently dropping the visual
     reference. Fill in `image_url` once they've uploaded the file and given
     you the resulting URL (see rule 5 below); don't invent a placeholder.
   If anything looks off, fix that row by hand (or re-parse after adjusting
   the input) rather than appending it as-is — a wrong `correct_answer` is
   worse than a skipped question, since it teaches the wrong thing silently.
3. **Only append.** When adding new questions, add new rows to the end of
   `data/questions.csv`. Never edit, reorder, or delete existing rows.
4. **Never "fix" existing content while appending.** If an existing
   question/rationale/choice looks wrong, flag it to the user and ask —
   don't silently rewrite it as a side effect of an unrelated append.
5. **Match the column format exactly** — see `data/questions.template.csv`:
   `category,tags,image_url,question,choice_1,choice_2,...,correct_answer,rationale,question_type,correct_order`
   - `category`: exactly one, required — the bounded "what kind of
     question" grouping (`Pharmacology`, `Prioritization`,
     `Maternal-Newborn`, ...). Reuse an existing category exactly (check the
     file first) rather than inventing a near-duplicate.
   - `tags`: zero or more freeform tags, pipe-delimited if more than one
     (e.g. `Respiratory`, or `Respiratory | Pediatric`). **Not scoped to a
     single category** — the same tag can and should be reused across
     categories when it fits (e.g. `Cardiovascular` can tag both a
     Pharmacology question and a Prioritization question). There's no fixed
     taxonomy to look up: whatever strings already appear across existing
     rows' `tags` *are* the tag list — reuse an existing tag's exact
     spelling/casing rather than inventing a near-duplicate (`Cardiovascular`
     vs `Cardiovascular System`). Leave blank for questions that don't need
     any — most categories won't need tags on every question.
   - `image_url`: optional. A URL to an illustration for this question
     (e.g. an anatomy diagram the question refers to as "the image below").
     The user uploads the actual image file by hand via the Supabase Studio
     Storage UI (bucket `question-images`, created in `supabase/schema.sql`)
     and pastes the resulting public URL here — there's no programmatic
     upload path from this environment. **When several questions share one
     image, reuse the exact same URL string across their rows** rather than
     treating them as separate images. Leave blank for questions with no
     image — most questions won't need one.
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
8. **Never commit `questions.csv`, `questions.sql`, or `updates.sql`.**
   They're gitignored on purpose — some source content may be copyrighted,
   and this data is for local/private use only. Don't remove the
   `.gitignore` exceptions for them.

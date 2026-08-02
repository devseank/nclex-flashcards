# Instructions for AI agents working in this folder

This folder holds the growing NCLEX question bank. `data/questions.csv` and
`data/questions.sql` are gitignored (private, real study content) —
`data/questions.template.csv` and this file are the only tracked exceptions.

## Rules

1. **Only append.** When adding new questions, add new rows to the end of
   `data/questions.csv`. Never edit, reorder, or delete existing rows.
2. **Never "fix" existing content while appending.** If an existing
   question/rationale/choice looks wrong, flag it to the user and ask —
   don't silently rewrite it as a side effect of an unrelated append.
3. **Match the column format exactly** — see `data/questions.template.csv`:
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
4. **After appending, regenerate the SQL from the *entire* file**, not just
   the new rows:
   ```
   node scripts/csv-to-sql.mjs data/questions.csv > data/questions.sql
   ```
   This is always safe to re-run on the full file — the generated SQL uses
   `on conflict (question) do nothing`, so already-imported questions are
   automatically skipped and only genuinely new rows get inserted when the
   user pastes it into the Supabase SQL Editor.
5. **Never commit `questions.csv` or `questions.sql`.** They're gitignored
   on purpose — some source content may be copyrighted, and this data is for
   local/private use only. Don't remove the `.gitignore` exceptions for them.

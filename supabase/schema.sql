-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

create table if not exists public.questions (
  id bigint generated always as identity primary key,
  -- Exactly one, required -- the bounded, small set a question's *type*
  -- falls into (Pharmacology, Prioritization, Maternal-Newborn, ...). This
  -- is the "what kind of question is this" dimension.
  category text not null,
  -- Zero or more freeform tags, NOT scoped to a single category -- the
  -- "what's it about" dimension (e.g. "Respiratory" can tag both a
  -- Pharmacology question and a Prioritization question). No fixed
  -- taxonomy/enum to keep in sync: whatever strings appear across
  -- `questions.tags` *are* the tag list.
  tags text[] not null default '{}',
  -- Deliberately NOT `unique` inline -- a plain btree unique constraint
  -- caps out at ~2704 bytes/row (1/3 of a page), which long NGN-style
  -- case-study stems can exceed and abort the whole insert. See the
  -- `questions_question_key` functional index below instead, which is
  -- fixed-size regardless of the question's length; importing an
  -- overlapping/compounded CSV uses `on conflict (md5(question)) do
  -- nothing` against that index rather than `on conflict (question)`.
  question text not null,
  choices jsonb not null,
  -- 'choice' (default): pick one or more of `choices` -- correct_indices is
  -- set, correct_order/grid_columns/grid_answer are null.
  -- 'sequence': arrange all of `choices` in the right order (e.g. steps of
  -- a procedure) -- correct_order is set (a permutation of choices'
  -- indices), the rest are null.
  -- 'grid': an NGN-style matrix -- `choices` are the row labels (e.g.
  -- findings/interventions), `grid_columns` are the column headers (e.g.
  -- ["Indicated", "Not indicated"]). Which column(s) are correct per row
  -- lives in the `grid_row_answers` child table below, not a column here --
  -- a row can have more than one correct column (matrix multiple-response),
  -- which a plain array column can't hold without being rectangular.
  -- correct_indices/correct_order are null.
  -- 'cloze': a sentence/paragraph with one or more dropdown blanks --
  -- `cloze_template` holds the sentence itself (blanks marked {{1}},
  -- {{2}}, ... in reading order); each blank's own option list and correct
  -- answer live in the `cloze_blanks`/`cloze_blank_options` child tables
  -- below, not a column here (a variable number of blanks, each with a
  -- variable number of options, same reasoning as grid_row_answers above).
  -- `choices` is unused for this type -- stored as '[]'::jsonb (still
  -- satisfies the not-null constraint below) since there's no single
  -- question-level choice list, each blank has its own.
  -- correct_indices/correct_order/grid_columns are null.
  -- 'bowtie': one shared stem (`question`) branches into three independent
  -- sections -- condition (pick exactly 1), actions (pick exactly 2),
  -- monitor (pick exactly 2). Each section's own choice list/answer(s) are
  -- fixed-shape (a plain text[] + integer/integer[]), so -- unlike grid/
  -- cloze above -- these are just plain columns, not a child table.
  -- `choices` is unused (stored as '[]'::jsonb, same as cloze).
  -- correct_indices/correct_order/grid_columns/cloze_* are null.
  -- 'hotspot': `image_url` (required for this type -- otherwise
  -- meaningless) plus the one correct clickable rectangle, as fractions
  -- (0-1) of the IMAGE'S OWN natural pixel width/height (not the on-screen
  -- rendered box, so it survives responsive resizing and object-fit
  -- letterboxing). Fixed-shape (always exactly 4 numbers), so plain
  -- columns, not a child table or nested type. `choices` is unused (same
  -- as cloze/bowtie). correct_indices/correct_order/grid_columns/cloze_*/
  -- bowtie_* are null.
  question_type text not null default 'choice',
  correct_indices integer[],
  correct_order integer[],
  grid_columns text[],
  cloze_template text,
  bowtie_condition_choices text[],
  bowtie_condition_answer integer,
  bowtie_action_choices text[],
  bowtie_action_answer integer[],
  bowtie_monitor_choices text[],
  bowtie_monitor_answer integer[],
  hotspot_x real,
  hotspot_y real,
  hotspot_width real,
  hotspot_height real,
  rationale text not null,
  -- Optional -- a URL to an illustration for this question (e.g. an
  -- anatomy diagram). When several questions share one image, reuse the
  -- exact same URL across their rows rather than duplicating the file.
  image_url text,
  -- True when the choices/rationale (or both) were written by an AI to
  -- reconstruct a question from a source that didn't give us enough to
  -- transcribe faithfully (e.g. a fill-in-the-blank whose distractor
  -- options were never shown) -- surfaced as a small badge in the UI so
  -- it's never confused for the source's own original content.
  ai_generated boolean not null default false,
  -- Which quiz-content batch/export this question was transcribed from
  -- (e.g. 'nurselabs', 'naxlex') -- provenance for spot-checking a source's
  -- accuracy or removing its content later, not shown in the app UI itself.
  -- No default: every future insert must say where its content came from.
  source text not null,
  created_at timestamptz not null default now()
);

-- Migrating an existing project: adds grid support + the AI-generated
-- content flag to a table created before this feature existed. Safe/
-- idempotent to re-run.
alter table public.questions add column if not exists grid_columns text[];
alter table public.questions add column if not exists ai_generated boolean not null default false;

-- Migrating an existing project: adds cloze support. Safe/idempotent to
-- re-run.
alter table public.questions add column if not exists cloze_template text;

-- Migrating an existing project: adds bowtie support. Safe/idempotent to
-- re-run.
alter table public.questions add column if not exists bowtie_condition_choices text[];
alter table public.questions add column if not exists bowtie_condition_answer integer;
alter table public.questions add column if not exists bowtie_action_choices text[];
alter table public.questions add column if not exists bowtie_action_answer integer[];
alter table public.questions add column if not exists bowtie_monitor_choices text[];
alter table public.questions add column if not exists bowtie_monitor_answer integer[];

-- Migrating an existing project: adds hot-spot support. Safe/idempotent to
-- re-run.
alter table public.questions add column if not exists hotspot_x real;
alter table public.questions add column if not exists hotspot_y real;
alter table public.questions add column if not exists hotspot_width real;
alter table public.questions add column if not exists hotspot_height real;

-- Migrating an existing project: backfills `source` for every question
-- imported before this column existed. Backfilled to '' (unknown) rather
-- than a guessed batch name, since which of the pre-existing questions
-- actually came from which source was never tracked. The default only
-- exists to satisfy the not-null constraint while backfilling -- it's
-- dropped immediately after so a future insert that forgets to set
-- `source` fails loudly instead of silently getting tagged ''.
-- Safe/idempotent to re-run.
alter table public.questions add column if not exists source text not null default '';
alter table public.questions alter column source drop default;

-- Migrating an existing project: `create table if not exists` above is a
-- no-op against an already-existing table, so this adds `tags` and retires
-- the old single-value `subcategory` column those questions used to have
-- (superseded by the multi-value `tags`). `category` itself is unchanged.
-- Safe/idempotent to re-run. Run this BEFORE re-importing questions.csv/
-- questions.sql with the category+tags format.
alter table public.questions add column if not exists tags text[] not null default '{}';
alter table public.questions drop column if exists subcategory;
alter table public.questions add column if not exists image_url text;

-- Public bucket for question illustration images (see `image_url` above).
-- Marking a bucket public makes Supabase serve its objects directly from
-- `/storage/v1/object/public/...` without requiring auth or a matching RLS
-- policy on `storage.objects` -- fine here since these are just anatomy
-- diagrams, nothing sensitive. Upload files via Supabase Studio's Storage
-- UI (service role, bypasses RLS) and paste the resulting public URL into
-- `image_url`.
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- GIN index for the array-containment filtering CategoryMode does
-- (tags @> array[...]) -- cheap at this table's size today, but correct
-- practice for tag-array queries generally and costs nothing to have.
create index if not exists questions_tags_idx on public.questions using gin (tags);

-- Dedup key for `question`, as an md5-hash functional index rather than a
-- plain unique constraint on the column itself -- see the comment on
-- `question` above. `drop constraint if exists` handles a database that
-- still has the original (too-narrow) inline `unique` constraint, which
-- shares this same default name and must be gone before the index below
-- can reuse it; it's a no-op on a fresh install or one that's already
-- been fixed.
alter table public.questions drop constraint if exists questions_question_key;
create unique index if not exists questions_question_key on public.questions (md5(question));

alter table public.questions enable row level security;

-- Question bank is shared across all signed-in users, but the app itself
-- requires login, so only "authenticated" (not "anon") can read here too --
-- otherwise the data would be fetchable directly via the public API key,
-- bypassing the login screen entirely. There is no insert/update/delete
-- policy, so writes are only possible from the Supabase Studio table/SQL
-- editor (which use the service role and bypass RLS).
drop policy if exists "Authenticated users can read questions" on public.questions;
create policy "Authenticated users can read questions"
  on public.questions
  for select
  to authenticated
  using (true);

-- A grid question's answer key: one row per correct cell. `row_index`/
-- `column_index` are 0-based positions into that question's own `choices`/
-- `grid_columns` arrays. A row having more than one correct column here is
-- exactly matrix multiple-response -- single-select is just the case where
-- a given (question_id, row_index) appears once. Not a jsonb column: this
-- is a genuinely tabular shape (rows x correct columns), and a plain array
-- column can't hold a variable number of correct columns per row without
-- being rectangular.
create table if not exists public.grid_row_answers (
  id bigint generated always as identity primary key,
  question_id bigint not null references public.questions (id) on delete cascade,
  row_index integer not null,
  column_index integer not null,
  unique (question_id, row_index, column_index)
);

alter table public.grid_row_answers enable row level security;

-- Mirrors `questions`' own read policy exactly -- this table carries no
-- per-user data, just more of the shared question bank.
drop policy if exists "Authenticated users can read grid_row_answers" on public.grid_row_answers;
create policy "Authenticated users can read grid_row_answers"
  on public.grid_row_answers
  for select
  to authenticated
  using (true);

-- Migrating an existing project: `grid` questions used to store exactly
-- one correct column per row in `questions.grid_answer` (a flat
-- integer[]). Matrix multiple-response needs a variable number of correct
-- columns per row, which that column can't represent -- this backfills
-- the old data into grid_row_answers above, then drops it. Guarded on the
-- column still existing, so this is a no-op both on a project created
-- fresh from this file (which never had `grid_answer`) and on a re-paste
-- after this has already run once (the column will already be gone).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions' and column_name = 'grid_answer'
  ) then
    insert into public.grid_row_answers (question_id, row_index, column_index)
    select q.id, t.row_index - 1, t.v
    from public.questions q, unnest(q.grid_answer) with ordinality as t(v, row_index)
    where q.question_type = 'grid' and q.grid_answer is not null
    on conflict (question_id, row_index, column_index) do nothing;

    alter table public.questions drop column grid_answer;
  end if;
end $$;

-- A cloze question's blanks, one row per {{n}} marker in cloze_template,
-- in reading order.
create table if not exists public.cloze_blanks (
  id bigint generated always as identity primary key,
  question_id bigint not null references public.questions (id) on delete cascade,
  blank_index integer not null,
  unique (question_id, blank_index)
);

alter table public.cloze_blanks enable row level security;

drop policy if exists "Authenticated users can read cloze_blanks" on public.cloze_blanks;
create policy "Authenticated users can read cloze_blanks"
  on public.cloze_blanks
  for select
  to authenticated
  using (true);

-- Each blank's own dropdown option list -- a variable number of options
-- per blank, same "can't be a plain array column" reasoning as
-- grid_row_answers. `is_correct` marks exactly one option per blank_id.
create table if not exists public.cloze_blank_options (
  id bigint generated always as identity primary key,
  blank_id bigint not null references public.cloze_blanks (id) on delete cascade,
  option_index integer not null,
  label text not null,
  is_correct boolean not null default false,
  unique (blank_id, option_index)
);

alter table public.cloze_blank_options enable row level security;

drop policy if exists "Authenticated users can read cloze_blank_options" on public.cloze_blank_options;
create policy "Authenticated users can read cloze_blank_options"
  on public.cloze_blank_options
  for select
  to authenticated
  using (true);

-- One row per answered question, used for the "questions got wrong" review
-- mode and the analytics dashboard. `user_id` defaults to the caller's own
-- id, so the client never needs to pass it explicitly.
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete cascade,
  selected_indices integer[] not null,
  -- Only set for a bowtie attempt (selected_indices is '{}' in that case)
  -- -- fixed-shape, so plain columns mirroring the answer key's own
  -- bowtie_* columns above, same reasoning as those.
  bowtie_condition integer,
  bowtie_actions integer[],
  bowtie_monitor integer[],
  -- Only set for a hot-spot attempt -- the clicked point, as fractions of
  -- the image's own natural width/height (same convention as the answer
  -- key's hotspot_x/y above). Plain real columns, not scaled integers:
  -- unlike selected_indices (a Postgres integer[], which can't hold
  -- floats), a dedicated column can just store the fraction directly.
  hotspot_x real,
  hotspot_y real,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists attempts_user_id_attempted_at_idx on public.attempts (user_id, attempted_at);
create index if not exists attempts_user_id_question_id_idx on public.attempts (user_id, question_id);

-- Migrating an existing project: adds bowtie response columns. Safe/
-- idempotent to re-run.
alter table public.attempts add column if not exists bowtie_condition integer;
alter table public.attempts add column if not exists bowtie_actions integer[];
alter table public.attempts add column if not exists bowtie_monitor integer[];

-- Migrating an existing project: adds hot-spot response columns. Safe/
-- idempotent to re-run.
alter table public.attempts add column if not exists hotspot_x real;
alter table public.attempts add column if not exists hotspot_y real;

alter table public.attempts enable row level security;

-- Each user can only see and record their own attempts -- never another
-- user's, and never anyone else's aggregate stats.
drop policy if exists "Users can insert their own attempts" on public.attempts;
create policy "Users can insert their own attempts"
  on public.attempts
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can read their own attempts" on public.attempts;
create policy "Users can read their own attempts"
  on public.attempts
  for select
  to authenticated
  using (user_id = auth.uid());

-- A submitted grid-multi-response answer: one row per column the user
-- selected, per row of the question. Mirrors grid_row_answers' own shape
-- for the same reason (variable number of selections per row, per
-- attempt). `attempts.selected_indices` stays not-null for every attempt
-- (choice/sequence/cloze all still use it directly) -- a grid attempt
-- simply records an empty array there and its real selections here
-- instead (see recordAttempt in src/services/attempts.ts).
create table if not exists public.attempt_grid_selections (
  id bigint generated always as identity primary key,
  attempt_id bigint not null references public.attempts (id) on delete cascade,
  row_index integer not null,
  column_index integer not null,
  unique (attempt_id, row_index, column_index)
);

create index if not exists attempt_grid_selections_attempt_id_idx on public.attempt_grid_selections (attempt_id);

alter table public.attempt_grid_selections enable row level security;

-- Same per-user isolation as `attempts` itself, via a join back to it
-- (this table has no user_id column of its own).
drop policy if exists "Users can insert their own attempt_grid_selections" on public.attempt_grid_selections;
create policy "Users can insert their own attempt_grid_selections"
  on public.attempt_grid_selections
  for insert
  to authenticated
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

drop policy if exists "Users can read their own attempt_grid_selections" on public.attempt_grid_selections;
create policy "Users can read their own attempt_grid_selections"
  on public.attempt_grid_selections
  for select
  to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- One row per user, upserted whenever a preference changes (theme, and now
-- the mono font choice from the UI overhaul). `user_id` is both the primary
-- key and defaults to the caller's own id, so upserts never need to pass it
-- explicitly.
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  font text not null default 'jetbrains' check (font in ('jetbrains', 'plex', 'space')),
  updated_at timestamptz not null default now()
);

-- Migrating an existing project: theme used to be a 3-way
-- system/light/dark choice; the app only ever offers light/dark now (no
-- persistent "system" mode), so any existing 'system' rows get resolved to
-- a real choice before the check constraint is tightened to match. Safe/
-- idempotent to re-run.
update public.user_settings set theme = 'light' where theme = 'system';
alter table public.user_settings alter column theme set default 'light';
alter table public.user_settings drop constraint if exists user_settings_theme_check;
alter table public.user_settings add constraint user_settings_theme_check check (theme in ('light', 'dark'));

-- Migrating an existing project: the `font` column is new (mono-brutalist UI
-- overhaul) -- add it if missing, matching the create-table default/check
-- above. Idempotent to re-run.
alter table public.user_settings add column if not exists font text not null default 'jetbrains';
alter table public.user_settings drop constraint if exists user_settings_font_check;
alter table public.user_settings add constraint user_settings_font_check check (font in ('jetbrains', 'plex', 'space'));

alter table public.user_settings enable row level security;

drop policy if exists "Users can read their own settings" on public.user_settings;
create policy "Users can read their own settings"
  on public.user_settings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- One row per (user, question) they've starred. The composite primary key
-- doubles as both the "did they favorite this?" lookup index and the
-- constraint preventing a question from ever being double-favorited, so
-- there's no separate surrogate id or unique constraint to keep in sync.
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
  on public.favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites
  for delete
  to authenticated
  using (user_id = auth.uid());

-- One row per (user, question) they've written a note for -- at most one,
-- enforced by the unique constraint below, same "1:1 with a question"
-- shape as favorites' composite key, just with a surrogate id since a note
-- also needs to be addressable on its own (the detail page's NEXT button
-- cursors through notes by id, not by question_id). Doesn't exist until
-- the first insert, and gets deleted again the moment its `inputs` would
-- otherwise be entirely blank -- see docs/adr/0002-note-row-lifecycle.md.
-- `inputs` is a jsonb array of up to 3 `{ text, tag }` objects; there is no
-- separate tags table -- see docs/adr/0001-freeform-note-tags-no-lookup-table.md.
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete cascade,
  inputs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

-- Backs both the NOTES.EXE list's own sort (updated_at desc, id desc as a
-- tiebreaker for same-timestamp rows) and the detail page's cursor-based
-- "next note" query, which walks this exact order without needing to know
-- what page it's on.
create index if not exists notes_user_id_updated_at_idx on public.notes (user_id, updated_at desc, id desc);

alter table public.notes enable row level security;

drop policy if exists "Users can read their own notes" on public.notes;
create policy "Users can read their own notes"
  on public.notes
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes
  for delete
  to authenticated
  using (user_id = auth.uid());

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
  -- unique so importing an overlapping/compounded CSV can safely use
  -- `on conflict (question) do nothing` instead of re-inserting duplicates
  question text not null unique,
  choices jsonb not null,
  -- 'choice' (default): pick one or more of `choices` -- correct_indices is
  -- set, correct_order/grid_columns/grid_answer are null.
  -- 'sequence': arrange all of `choices` in the right order (e.g. steps of
  -- a procedure) -- correct_order is set (a permutation of choices'
  -- indices), the rest are null.
  -- 'grid': an NGN-style matrix -- `choices` are the row labels (e.g.
  -- findings/interventions), `grid_columns` are the column headers (e.g.
  -- ["Indicated", "Not indicated"]), and `grid_answer` gives, for each row
  -- (same order as `choices`), the index into `grid_columns` that's
  -- correct for that row. correct_indices/correct_order are null.
  question_type text not null default 'choice',
  correct_indices integer[],
  correct_order integer[],
  grid_columns text[],
  grid_answer integer[],
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
alter table public.questions add column if not exists grid_answer integer[];
alter table public.questions add column if not exists ai_generated boolean not null default false;

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

alter table public.questions enable row level security;

-- Question bank is shared across all signed-in users, but the app itself
-- requires login, so only "authenticated" (not "anon") can read here too --
-- otherwise the data would be fetchable directly via the public API key,
-- bypassing the login screen entirely. There is no insert/update/delete
-- policy, so writes are only possible from the Supabase Studio table/SQL
-- editor (which use the service role and bypass RLS).
create policy "Authenticated users can read questions"
  on public.questions
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
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists attempts_user_id_attempted_at_idx on public.attempts (user_id, attempted_at);
create index if not exists attempts_user_id_question_id_idx on public.attempts (user_id, question_id);

alter table public.attempts enable row level security;

-- Each user can only see and record their own attempts -- never another
-- user's, and never anyone else's aggregate stats.
create policy "Users can insert their own attempts"
  on public.attempts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can read their own attempts"
  on public.attempts
  for select
  to authenticated
  using (user_id = auth.uid());

-- One row per user, upserted whenever a preference changes (currently just
-- the theme). `user_id` is both the primary key and defaults to the
-- caller's own id, so upserts never need to pass it explicitly.
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
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

alter table public.user_settings enable row level security;

create policy "Users can read their own settings"
  on public.user_settings
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own settings"
  on public.user_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

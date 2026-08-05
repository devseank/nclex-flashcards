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
  -- set, correct_order is null.
  -- 'sequence': arrange all of `choices` in the right order (e.g. steps of
  -- a procedure) -- correct_order is set (a permutation of choices'
  -- indices), correct_indices is null.
  question_type text not null default 'choice',
  correct_indices integer[],
  correct_order integer[],
  rationale text not null,
  created_at timestamptz not null default now()
);

-- Migrating an existing project: `create table if not exists` above is a
-- no-op against an already-existing table, so this adds `tags` and retires
-- the old single-value `subcategory` column those questions used to have
-- (superseded by the multi-value `tags`). `category` itself is unchanged.
-- Safe/idempotent to re-run. Run this BEFORE re-importing questions.csv/
-- questions.sql with the category+tags format.
alter table public.questions add column if not exists tags text[] not null default '{}';
alter table public.questions drop column if exists subcategory;

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
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  updated_at timestamptz not null default now()
);

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

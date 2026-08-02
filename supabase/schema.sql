-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

create table if not exists public.questions (
  id bigint generated always as identity primary key,
  category text not null,
  question text not null,
  choices jsonb not null,
  correct_index integer not null,
  rationale text not null,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Question bank is shared/public: anyone (including unauthenticated users)
-- can read it. There is no insert/update/delete policy, so writes are only
-- possible from the Supabase Studio table editor or SQL editor (which use
-- the service role and bypass RLS).
create policy "Anyone can read questions"
  on public.questions
  for select
  to anon, authenticated
  using (true);

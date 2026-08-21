# Instructions for AI agents: the /dev-preview fixture harness

This file is tracked in git; everything else in `src/dev/` (and
`src/app/dev-preview/`) is gitignored on purpose — see
[`../../.gitignore`](../../.gitignore). That means **it's normal for this
directory to contain only this file** in a fresh checkout or a fresh agent
session. If you need to verify a UI change and the harness isn't present,
recreate it using the recipe below rather than assuming it's missing by
mistake or trying to test against real Supabase auth instead.

## Why this exists

`questions`/`attempts`/`user_settings` are all RLS-protected, scoped to
`auth.uid()`. There is no way to produce a real, valid `auth.uid()` from
this environment — that requires an actual interactive Google OAuth
round-trip in a real browser, which nothing here can script. So verifying
any UI/logic change would otherwise mean asking the user to manually test
every change themselves. Instead: a small in-memory fixture set stands in
for Supabase, wired into exact copies of the real screens/hooks, served at
`/dev-preview` with no login required.

## The recipe (four files)

Don't copy field-for-field from an old version of this doc — hooks and
components evolve, and a stale mirror is worse than no mirror. Instead,
read the **current** `src/hooks/useQuizSession.ts` and
`src/components/FlashcardApp.tsx` and reproduce their current shape:

1. **`src/dev/fixtures.ts`** — a handful of hand-written `Question`/
   `Attempt` fixture objects (see `src/services/questions.ts` and
   `src/services/attempts.ts` for the current types) plus
   `fetchQuestionMetaFixture()` / `fetchQuestionsByIdsFixture()` /
   `fetchAttemptsFixture()` / `recordAttemptFixture()` async functions
   mirroring `src/services/questions.ts` and `src/services/attempts.ts`'s
   exported function signatures, backed by an in-memory array instead of
   Supabase. Include at least: one never-attempted question (to exercise
   the NEW badge / new-question cheer message), one `sequence`-type
   question, one multi-select (SATA) question, and a mix of
   correct/incorrect past attempts spread across a few different days (to
   exercise REVIEW/NEW range filters and the analytics trend chart).
2. **`src/dev/useQuizSessionTest.ts`** — a copy of
   `src/hooks/useQuizSession.ts` with its Supabase-backed imports
   (`@/services/questions`, `@/services/attempts`) swapped for the fixture
   functions above. Keep every exported field/function name and signature
   identical to the real hook — `FlashcardAppTest.tsx` (below) should wire
   up exactly like the real `FlashcardApp.tsx` does, just against this hook
   instead.
3. **`src/dev/FlashcardAppTest.tsx`** — a copy of
   `src/components/FlashcardApp.tsx` with `useQuizSession` swapped for
   `useQuizSessionTest`, `fetchQuestionMeta` swapped for
   `fetchQuestionMetaFixture`, and `<AuthGate>`/`<SignOutButton>` removed
   (no auth to gate). Every screen component it renders (`Landing`,
   `FilterMode`, `Flashcard`, `Analytics`, ...) should be the **real**
   production component, imported directly — only the data layer is fake.
   Note: `Analytics.tsx` itself calls the real `fetchAttempts` from
   `@/services/attempts` internally rather than taking attempts as a prop —
   either accept that its dev-preview view will show empty/real data, or
   (for a one-off screenshot need) intercept the Supabase REST call at the
   network layer instead of trying to make Analytics fixture-aware.
4. **`src/app/dev-preview/page.tsx`** — a minimal page rendering
   `FlashcardAppTest`, plus a visible "DEV FIXTURE MODE -- NOT REAL DATA"
   banner so it's never mistaken for the real app in a screenshot.

## Rules

- **Never import anything under `src/dev/` from production code** (nothing
  under `src/app/` except `src/app/dev-preview/page.tsx` itself,
  `src/components/`, `src/hooks/`, `src/lib/`, or `src/services/`). If you
  find yourself wanting to, the thing you need probably belongs in a shared
  module instead of the fixture harness.
- **When you change a production hook/component this harness mirrors,
  apply the same change to its `src/dev/` copy in the same turn** — a
  drifted mirror gives false confidence (it "works" only because it's
  testing stale logic).
- This harness is for verifying **your own** changes before they ship, not
  a feature — don't add it to the sitemap, don't link to it from the real
  app, and don't spend effort making its fixture data comprehensive beyond
  what's needed to exercise the screens you're actually touching.

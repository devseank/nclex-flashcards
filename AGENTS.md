<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context for AI agents

Human-facing overview lives in [`README.md`](README.md) — read that first for
what this app is and how to run it. This file is about *how to work in this
codebase*: conventions that aren't obvious from the code alone, and the
verification steps expected before a change counts as done.

## Architecture in one paragraph

`FlashcardApp.tsx` renders whichever screen `useQuizSession` (in
`src/hooks/`) says the current `view` is; that hook owns all quiz state and
every transition between screens (start a mode, answer a question, go back
to menu, etc.) — components themselves hold no cross-screen state. Data
reads/writes go through `src/services/*.ts`, one file per Supabase table,
each exporting plain async functions (no class, no hook) that map
snake_case DB rows to camelCase domain types. `ThemeProvider`
(`src/lib/theme.tsx`) is the one piece of genuinely global state outside
that hook, since it has to be readable before the quiz session even exists
(the pre-hydration theme script in `layout.tsx`).

Question data itself never ships in this repo — `data/questions.csv` is
gitignored, private study content. See `data/AI_INSTRUCTIONS.md` for the
append-only workflow if you're asked to add questions; it has its own
self-verification rules, separate from the ones below.

## Conventions specific to this repo

- **`nes.css` supplies the pixel-art look; don't fight it with ad-hoc CSS.**
  Use `nes-btn`/`nes-container`/`is-primary`/`is-warning`/etc. classes
  first. When you do need a genuinely custom effect (confetti, badges,
  sticky bars), it lives as a named class in `globals.css` with a comment
  explaining *why* it's not just a Tailwind utility — follow that pattern
  rather than inlining one-off styles.
- **Dark mode is a `.dark` class on `<html>`, not `prefers-color-scheme`
  alone.** Tailwind's `dark:` variant is configured via
  `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`
  specifically so the in-app SYSTEM/LIGHT/DARK picker can override the OS
  setting. If you add a new light-background component, check it in dark
  mode too — nes.css's own default colors (white button/container
  backgrounds, near-black borders) do **not** flip automatically. The
  existing dark-mode overrides in `globals.css` (search for `.dark .nes-btn`
  and neighboring rules) are the pattern to extend, not duplicate — add new
  Tailwind gray/white utility classes to those existing selectors rather
  than writing new one-off `.dark .whatever` rules.
- **`react-hooks/purity` / `react-hooks/set-state-in-effect` are enforced.**
  `Math.random()`, `Date.now()`, `new Date()` must not be called during
  render or bare `useEffect` mount bodies. Build any randomized/timestamped
  value in an actual event handler (see `ConfettiBurst.tsx`'s
  `buildConfettiConfig()`) and pass it down as a prop/state, rather than
  deriving it inline in JSX or a `useMemo`.
- **The `src/dev/` fixture harness (`/dev-preview`) mirrors production
  components, not a mock of them — and it's gitignored, local-only.** It
  exists because `attempts`/`questions`/`user_settings` RLS requires a real
  authenticated `auth.uid()`, which the anon key can't produce outside real
  Google OAuth — there's no way to log in programmatically here. Everything
  under `src/dev/` except `AI_INSTRUCTIONS.md` is gitignored, so it may not
  exist in your checkout; see `src/dev/AI_INSTRUCTIONS.md` for what it is
  and the recipe to recreate it if you need to verify a UI change. When you
  change a hook or screen component that the harness also wires up
  (`useQuizSessionTest.ts`, `FlashcardAppTest.tsx`), apply the same change
  to both, or the fixture route silently drifts from what's actually
  shipping. It is never imported by production code — don't wire it into
  `FlashcardApp.tsx` or `layout.tsx`.
- **Static images referenced from CSS/components must be real module
  imports (`import img from "@/assets/..."`), not `public/`-folder string
  paths.** The GitHub Pages deploy sets a `/nclex-flashcards` basePath
  (`GITHUB_PAGES=true` in `next.config.ts`); Next's bundler applies that
  prefix automatically to imported assets, but a plain
  `<img src="/foo.png">` or CSS `url("/foo.png")` string won't get it and
  will 404 in production while working fine in local dev (where there's no
  basePath) — a mismatch that's easy to miss without actually testing a
  `GITHUB_PAGES=true` build.
- **Supabase writes never pass `user_id` explicitly.** Every table's
  `user_id` column defaults to `auth.uid()` and RLS policies scope
  select/insert/update to `user_id = auth.uid()` (see
  `supabase/schema.sql`). Follow that pattern for any new per-user table —
  don't thread a user id through from the client.
- **Schema changes are hand-applied, not migrated.** There's no migration
  tool; `supabase/schema.sql` is the source of truth and is written to be
  idempotent (`create table if not exists`, `create policy` guarded the
  same way where relevant) so it's always safe to paste the whole file into
  the Supabase SQL Editor again. If you add/change a table, update this file
  *and* tell the user explicitly that they need to run it themselves — you
  cannot reach their Supabase project directly.

## Verification and results validation

No automated test suite exists for this app — the steps below are the only
safety net, and skipping them is how regressions ship silently. Do all of
these before considering a change finished, not just the ones that seem
relevant:

1. **`pnpm lint` and `pnpm build` must both be clean.** Build failures on
   `GITHUB_PAGES=true` specifically (basePath/asset issues) won't always
   surface on a plain `pnpm build` — if you touched anything asset- or
   route-related, also run `GITHUB_PAGES=true pnpm build` and grep the
   output `out/` for the asset path to confirm the `/nclex-flashcards`
   prefix actually made it in (see git history around the dark-mode PLAY
   button image work for the exact grep pattern used).
2. **Visually verify UI changes in a browser — don't infer correctness from
   reading the code.** Use `/dev-preview` (no auth needed) via the
   project's browser tooling: check both light and dark mode, check a
   mobile viewport (this is a mobile-first pixel-art app), and click
   through the actual interaction, not just the resting state (press states,
   revealed-answer states, disabled states, etc. all have their own styling
   that a static screenshot of the idle screen won't catch).
3. **Check the browser console for errors after interacting**, not just
   that the page rendered — several past bugs here (stray focus rings,
   clipped box-shadows, hydration mismatches) were silent until actually
   clicking through a full flow.
4. **When a fix is about a specific visual bug someone reported, reproduce
   the bug first, in the same component/context they saw it in, before
   trusting that your fix addresses it.** A CSS rule that looks correct in
   isolation can still fail to apply where it matters — e.g. a `box-shadow`
   ring added for one component silently got clipped by a *different*
   component's own `overflow-hidden`, even though the underlying CSS
   selector matched both. Confirm the fix against the actual reported
   location, not a similar-looking but different element.
5. **After pushing to `main`, watch the deploy, don't assume it passed.**
   `gh run list --limit 1` / `gh run watch <id> --exit-status` against
   `.github/workflows/deploy.yml` — report success only once that's
   actually green.
6. **For Supabase schema changes, remind the user to apply the SQL
   themselves** (Supabase SQL Editor) — there is no programmatic path to
   their database from this environment, and a feature that reads/writes a
   new table will silently no-op (or throw, depending on RLS) until the
   table actually exists.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars",
  );
}

// detectSessionInUrl parses the #access_token=... fragment Supabase appends
// to the redirect URL after Google OAuth completes; without it the app
// would load signed-out even right after a successful sign-in.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// PostgREST caps a single `select()` at the project's configured max-rows
// (1000 by default in Supabase) regardless of the table's real size --
// silently, with no error, just a truncated result. Every table-wide read
// in this app (fetchAllQuestions, fetchAttempts, ...) goes through this
// instead of a bare `.select()` so growing past that cap doesn't quietly
// cap PLAY/FILTER/HISTORY at whatever the limit happens to be that day.
// `query` must apply a stable `.order(...)` (e.g. by primary key) before
// `.range()` -- without one, Postgres doesn't guarantee the same row
// order across separate paginated requests, which can duplicate or skip
// rows at page boundaries.
//
// `data` is typed `unknown` (cast to `T[]` internally) rather than
// `T[] | null` in the callback's own return type -- this client isn't
// generated against a typed schema, so a query builder's inferred success
// type for a hand-written `.select("...")` string is a generic error-shape
// fallback, not the caller's real row type, and threading `T` through the
// callback's signature would just fight that inference instead of the
// existing `row as unknown as X` cast pattern this project already uses
// at each call site.
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data as T[] | null) ?? [];
    all.push(...page);
    if (page.length < pageSize) return all;
    from += pageSize;
  }
}

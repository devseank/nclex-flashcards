import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal config -- just the `@/` path alias (matching tsconfig.json) so
// test files can import from `src/` the same way app code does, plus dummy
// Supabase env vars as a defensive safety net for any future test file that
// transitively imports `@/lib/supabase` (which throws on its own "missing
// env var" guard otherwise). No real Supabase calls happen in tests --
// `createClient` doesn't touch the network until a query is actually made,
// and nothing here does that.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-placeholder-key",
    },
  },
});

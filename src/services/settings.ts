import { supabase } from "@/lib/supabase";

// No `.eq("user_id", ...)` needed on either call below -- RLS scopes select
// to the caller's own row, and `user_id` defaults to auth.uid() on insert.
// `maybeSingle()` (not `single()`) on fetch because a brand-new user has no
// row yet, which is a valid "no preference saved" result, not an error.

export type ThemePreference = "light" | "dark";

function isThemePreference(value: string): value is ThemePreference {
  return value === "light" || value === "dark";
}

export async function fetchThemePreference(): Promise<ThemePreference | null> {
  const { data, error } = await supabase.from("user_settings").select("theme").maybeSingle();
  if (error) throw error;
  return data && isThemePreference(data.theme) ? data.theme : null;
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ theme, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

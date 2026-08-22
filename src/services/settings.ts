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

export type FontPreference = "jetbrains" | "plex" | "space";

function isFontPreference(value: string): value is FontPreference {
  return value === "jetbrains" || value === "plex" || value === "space";
}

export async function fetchFontPreference(): Promise<FontPreference | null> {
  const { data, error } = await supabase.from("user_settings").select("font").maybeSingle();
  if (error) throw error;
  return data && isFontPreference(data.font) ? data.font : null;
}

export async function saveFontPreference(font: FontPreference): Promise<void> {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ font, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

// Keyed by lowercased tag -> "#rrggbb". A brand-new user (or one who's
// never customized a color) has no row/column value yet -- `{}` is the
// valid "nothing customized" result, same as theme/font's `null`.
export type TagColorMap = Record<string, string>;

export async function fetchNoteTagColors(): Promise<TagColorMap> {
  const { data, error } = await supabase.from("user_settings").select("note_tag_colors").maybeSingle();
  if (error) throw error;
  return (data?.note_tag_colors as TagColorMap | null) ?? {};
}

// Always writes the whole map (same "overwrite the full value" shape as
// theme/font) -- the caller merges the one changed tag in locally first,
// so this never races a concurrent per-tag update against itself.
export async function saveNoteTagColors(colors: TagColorMap): Promise<void> {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ note_tag_colors: colors, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

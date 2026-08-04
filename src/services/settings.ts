import { supabase } from "@/lib/supabase";

export type ThemePreference = "system" | "light" | "dark";

function isThemePreference(value: string): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
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

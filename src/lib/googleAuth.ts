import { supabase } from "@/lib/supabase";

const LAST_EMAIL_KEY = "nclex-last-email";

export function rememberSignedInEmail(email: string) {
  localStorage.setItem(LAST_EMAIL_KEY, email);
}

// `forceAccountChooser` skips `login_hint` (which otherwise silently signs
// back into the last-used account) and instead passes `prompt:
// "select_account"`, which reliably makes Google show its account picker
// even when only one Google session is active in the browser -- login_hint
// alone can't be used for this since its whole point is suppressing the
// picker. Calling this while already signed in (e.g. from "switch account"
// next to Sign out) works fine too -- Supabase just replaces the active
// session with whichever account comes back from the OAuth round-trip.
export function signInWithGoogle(forceAccountChooser = false) {
  const lastEmail = !forceAccountChooser && localStorage.getItem(LAST_EMAIL_KEY);
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: forceAccountChooser
        ? { prompt: "select_account" }
        : lastEmail
          ? { login_hint: lastEmail }
          : {},
    },
  });
}

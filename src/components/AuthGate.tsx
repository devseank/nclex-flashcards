"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import AnimatedHeart from "@/components/AnimatedHeart";
import PixelWindow from "@/components/PixelWindow";

const LAST_EMAIL_KEY = "nclex-last-email";

function signInWithGoogle() {
  const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      // Google shows its account chooser whenever multiple Google accounts
      // are signed into the browser, regardless of any `prompt` setting.
      // Passing login_hint tells it exactly which account to use, so it
      // signs back in silently instead of asking every time.
      ...(lastEmail ? { queryParams: { login_hint: lastEmail } } : {}),
    },
  });
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();

  useEffect(() => {
    if (session?.user.email) {
      localStorage.setItem(LAST_EMAIL_KEY, session.user.email);
    }
  }, [session]);

  if (session === undefined) {
    return <div className="min-h-dvh" />;
  }

  if (!session) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 pt-16 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <PixelWindow title="LOGIN.EXE">
          <AnimatedHeart />
          <button
            type="button"
            onClick={signInWithGoogle}
            className="font-pixel text-sm text-[var(--text-navy)] blink flex items-center justify-center gap-2 mx-auto cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-navy-strong)]"
          >
            <i className="nes-icon google is-small m-0" />
            PRESS START
          </button>
        </PixelWindow>
      </div>
    );
  }

  return <>{children}</>;
}

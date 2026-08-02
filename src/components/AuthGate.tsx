"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user.email) {
        localStorage.setItem(LAST_EMAIL_KEY, session.user.email);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen" />;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <PixelWindow title="LOGIN.EXE">
          <AnimatedHeart />
          <button
            type="button"
            onClick={signInWithGoogle}
            className="font-pixel text-sm text-[#33415c] blink flex items-center justify-center gap-2 mx-auto cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#12314a]"
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

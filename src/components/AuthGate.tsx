"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function signInWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen" />;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="font-pixel text-lg sm:text-xl text-[#33415c] text-center leading-relaxed">
          NCLEX-RN Flashcards
        </h1>
        <div className="nes-container is-rounded bg-white max-w-sm w-full text-center space-y-5">
          <i className="nes-icon heart is-large bob inline-block" />
          <p className="text-base">Sign in to start studying.</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="nes-btn is-primary w-full font-pixel text-xs py-3 flex items-center justify-center gap-3"
          >
            <i className="nes-icon google is-small" />
            SIGN IN WITH GOOGLE
          </button>
          <p className="font-pixel text-[10px] text-gray-400 blink">PRESS START</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

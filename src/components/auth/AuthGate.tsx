"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/useSession";
import { signInWithGoogle, rememberSignedInEmail } from "@/lib/googleAuth";
import AnimatedHeart from "@/components/session/AnimatedHeart";
import PixelWindow from "@/components/ui/PixelWindow";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();

  useEffect(() => {
    if (session?.user.email) {
      rememberSignedInEmail(session.user.email);
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
            onClick={() => signInWithGoogle()}
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

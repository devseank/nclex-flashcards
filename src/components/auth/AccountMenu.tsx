"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/googleAuth";
import ThemeToggle from "@/components/ui/ThemeToggle";

// Replaces the home screen's decorative close button (see PixelWindow's
// headerAction) with a real hamburger menu -- sign out, switch account, and
// display settings all live here now instead of a permanently-visible link
// row above every screen.
export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="cursor-pointer bg-[#faf1de] border-2 border-black leading-none p-1.5 flex flex-col justify-center gap-[3px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--text-navy-strong)]"
      >
        <span className="block w-4 h-[2px] bg-black" aria-hidden="true" />
        <span className="block w-4 h-[2px] bg-black" aria-hidden="true" />
        <span className="block w-4 h-[2px] bg-black" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-fade-in absolute right-0 top-full mt-2 z-50 w-56 nes-container is-rounded bg-white p-3 text-left space-y-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signInWithGoogle(true);
              }}
              className="nes-btn is-warning w-full font-pixel text-[9px] py-2"
            >
              Switch account
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                supabase.auth.signOut();
              }}
              className="nes-btn is-error w-full font-pixel text-[9px] py-2"
            >
              Sign out
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-pixel text-[9px] text-gray-400">DISPLAY</p>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}

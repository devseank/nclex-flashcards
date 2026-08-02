"use client";

import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => supabase.auth.signOut()}
      className="font-pixel text-[10px] text-[#33415c] underline"
    >
      Sign out
    </button>
  );
}

"use client";

import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/googleAuth";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FontToggle from "@/components/ui/FontToggle";
import { UserCog, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

// Replaces the home screen's decorative close button (see PixelWindow's
// headerAction) with a real hamburger menu -- sign out, switch account, and
// display settings all live here now instead of a permanently-visible link
// row above every screen.
export default function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="cursor-pointer border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] leading-none p-1.5 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
        >
          <Menu size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="dropdown-fade-in w-56 border border-[var(--border)] bg-[var(--surface)] text-[var(--surface-foreground)] rounded-none p-3 space-y-3"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => signInWithGoogle(true)}
            className="w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[9px] uppercase tracking-wider py-2 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            <UserCog size={14} />
            Switch account
          </button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-[9px] uppercase tracking-wider py-2 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Theme</p>
          <ThemeToggle />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">Font</p>
          <FontToggle />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

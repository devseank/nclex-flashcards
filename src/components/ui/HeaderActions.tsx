"use client";

import HomeButton from "@/components/ui/HomeButton";
import AccountMenu from "@/components/auth/AccountMenu";
import { useGoToMenu } from "@/lib/goToMenuContext";

// The pair of icon buttons every screen's header bar (PixelWindow's
// headerAction slot, or FlashcardShell/TitleBar's own) shows on its right
// side -- Home (jump straight to the main menu) and the account/display
// hamburger. Reads its Home action from context (see goToMenuContext.tsx)
// rather than taking a prop, so dropping <HeaderActions /> into a new
// screen's header never requires threading anything through it.
export default function HeaderActions() {
  const goToMenu = useGoToMenu();

  return (
    <div className="flex items-center gap-2">
      <HomeButton onClick={goToMenu} />
      <AccountMenu />
    </div>
  );
}

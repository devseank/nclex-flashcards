"use client";

import AuthGate from "@/components/auth/AuthGate";
import FlashcardApp from "@/components/FlashcardApp";

export default function Home() {
  return (
    <AuthGate>
      <FlashcardApp />
    </AuthGate>
  );
}

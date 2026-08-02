"use client";

import AuthGate from "@/components/AuthGate";
import FlashcardApp from "@/components/FlashcardApp";

export default function Home() {
  return (
    <AuthGate>
      <FlashcardApp />
    </AuthGate>
  );
}

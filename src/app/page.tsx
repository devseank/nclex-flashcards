"use client";

import { useEffect, useState } from "react";
import { questions, Question } from "@/data/questions";
import Flashcard from "@/components/Flashcard";

function pickRandom(excludeId?: string): Question {
  const pool = excludeId ? questions.filter((q) => q.id !== excludeId) : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Home() {
  const [current, setCurrent] = useState<Question | null>(null);

  useEffect(() => {
    setCurrent(pickRandom());
  }, []);

  if (!current) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="font-pixel text-lg sm:text-xl text-white text-center leading-relaxed">
        NCLEX-RN Flashcards
      </h1>
      <Flashcard
        key={current.id}
        question={current}
        onNext={() => setCurrent(pickRandom(current.id))}
      />
    </div>
  );
}

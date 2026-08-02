"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import Flashcard from "@/components/Flashcard";

function pickRandom(pool: Question[], excludeId?: number): Question {
  const filtered = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [current, setCurrent] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllQuestions()
      .then((qs) => {
        setQuestions(qs);
        setCurrent(pickRandom(qs));
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="font-pixel text-sm text-[#33415c] text-center leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!questions || !current) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="font-pixel text-lg sm:text-xl text-[#33415c] text-center leading-relaxed">
        NCLEX-RN Flashcards
      </h1>
      <Flashcard
        key={current.id}
        question={current}
        onNext={() => setCurrent(pickRandom(questions, current.id))}
      />
    </div>
  );
}

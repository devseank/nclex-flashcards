"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { supabase } from "@/lib/supabase";
import Flashcard from "@/components/Flashcard";

function pickRandom(pool: Question[], excludeId?: number): Question {
  const filtered = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export default function FlashcardApp() {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="font-pixel text-[10px] text-[#33415c] underline"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p className="font-pixel text-sm text-[#33415c] text-center leading-relaxed">{error}</p>
      )}

      {!error && questions && current && (
        <Flashcard
          key={current.id}
          question={current}
          onNext={() => setCurrent(pickRandom(questions, current.id))}
        />
      )}
    </div>
  );
}

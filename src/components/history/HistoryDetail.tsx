"use client";

import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import QuestionCard from "@/components/session/QuestionCard";
import HeaderActions from "@/components/ui/HeaderActions";

export default function HistoryDetail({
  question,
  response,
  stats,
}: {
  question: Question;
  response: number[];
  stats?: QuestionStats;
}) {
  // `stats` must come from the caller (computed once for the whole history
  // list) rather than being looked up here -- this question has clearly
  // been attempted (that's why it's in history), but without `stats`
  // QuestionCard/Flashcard has no way to know that and renders the
  // never-attempted "NEW" badge instead.
  return (
    <div className="w-full max-w-xl flex flex-col items-center">
      <QuestionCard
        headerLeft="HISTORY"
        headerAction={<HeaderActions />}
        question={question}
        mode="review"
        initialResponse={response}
        stats={stats}
      />
    </div>
  );
}

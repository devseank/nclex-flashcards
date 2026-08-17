"use client";

import { Question } from "@/services/questions";
import QuestionCard from "@/components/session/QuestionCard";
import HeaderActions from "@/components/ui/HeaderActions";

// Shows the full question in review mode (all correct answers revealed) so
// the user can identify it clearly — no prior response to pre-fill here
// (unlike HistoryDetail which replays a specific attempt).
export default function FavoritesDetail({
  question,
  isFavorited,
  onToggleFavorite,
}: {
  question: Question;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center">
      <QuestionCard
        headerLeft="FAVORITE"
        headerAction={<HeaderActions />}
        question={question}
        mode="review"
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}

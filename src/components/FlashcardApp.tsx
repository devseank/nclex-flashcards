"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { getErrorMessage } from "@/lib/errorMessage";
import { useQuizSession } from "@/hooks/useQuizSession";
import Landing from "@/components/Landing";
import CategoryMode from "@/components/CategoryMode";
import ReviewMode from "@/components/ReviewMode";
import Analytics from "@/components/Analytics";
import PixelWindow from "@/components/PixelWindow";
import SessionScreen from "@/components/SessionScreen";
import FinishedScreen from "@/components/FinishedScreen";
import SignOutButton from "@/components/SignOutButton";
import NoticeBanner from "@/components/NoticeBanner";

export default function FlashcardApp() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllQuestions()
      .then(setQuestions)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const categories = questions ? [...new Set(questions.map((q) => q.category))].sort() : [];

  const {
    view,
    mode,
    queue,
    index,
    current,
    answers,
    questionStats,
    notice,
    score,
    modeTitle,
    startMode,
    startReviewByRange,
    startReviewByCategory,
    backToMenu,
    goToCategoryPick,
    goToReviewPick,
    goToAnalytics,
    handleNext,
  } = useQuizSession(questions);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start sm:justify-center gap-8 px-4 pt-16 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <SignOutButton />

      {error && (
        <p className="font-pixel text-sm text-[#33415c] text-center leading-relaxed">{error}</p>
      )}

      {!error && questions && view === "menu" && (
        <PixelWindow title="MENU.EXE">
          <Landing
            onSelectMode={(m) => startMode(m)}
            onSelectCategory={goToCategoryPick}
            onSelectReview={goToReviewPick}
            onSelectAnalytics={goToAnalytics}
          />
        </PixelWindow>
      )}

      {!error && view === "categoryPick" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <PixelWindow title="CATEGORY.EXE">
            <CategoryMode
              categories={categories}
              onStart={(category, m) => startMode(m, category)}
              onStartWrong={startReviewByCategory}
              onBack={backToMenu}
            />
          </PixelWindow>
          {notice && <NoticeBanner notice={notice} />}
        </div>
      )}

      {!error && view === "reviewPick" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <PixelWindow title="REVIEW.EXE">
            <ReviewMode onSelect={startReviewByRange} onBack={backToMenu} />
          </PixelWindow>
          {notice && <NoticeBanner notice={notice} />}
        </div>
      )}

      {!error && view === "analytics" && questions && (
        <Analytics questions={questions} onBack={backToMenu} />
      )}

      {!error && view === "finished" && mode && modeTitle && (
        <FinishedScreen
          title={modeTitle}
          score={score}
          total={queue.length}
          queue={queue}
          answers={answers}
          questionStats={questionStats}
          onBackToMenu={backToMenu}
        />
      )}

      {!error && view === "session" && mode && current && (
        <SessionScreen
          mode={mode}
          current={current}
          index={index}
          queueLength={queue.length}
          stats={mode === "review" ? questionStats?.get(current.id) : undefined}
          onNext={handleNext}
          onBack={backToMenu}
        />
      )}
    </div>
  );
}

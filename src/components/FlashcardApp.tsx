"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { getErrorMessage } from "@/lib/errorMessage";
import { useQuizSession, Notice } from "@/hooks/useQuizSession";
import Landing from "@/components/Landing";
import FilterMode from "@/components/picker/FilterMode";
import ReviewMode from "@/components/picker/ReviewMode";
import NewMode from "@/components/picker/NewMode";
import HistoryMode from "@/components/picker/HistoryMode";
import HistoryList from "@/components/history/HistoryList";
import HistoryDetail from "@/components/history/HistoryDetail";
import Analytics from "@/components/analytics/Analytics";
import PixelWindow from "@/components/ui/PixelWindow";
import SessionScreen from "@/components/session/SessionScreen";
import FinishedScreen from "@/components/session/FinishedScreen";
import SignOutButton from "@/components/auth/SignOutButton";
import NoticeBanner from "@/components/ui/NoticeBanner";

// A PixelWindow plus its below-the-fold notice banner, for the two picker
// screens (category/review) that share this exact layout.
function PickerScreen({
  title,
  notice,
  children,
}: {
  title: string;
  notice: Notice | null;
  children: React.ReactNode;
}) {
  return (
    <div className="view-fade-in w-full max-w-sm flex flex-col items-center gap-3">
      <PixelWindow title={title}>{children}</PixelWindow>
      {notice && <NoticeBanner notice={notice} />}
    </div>
  );
}

export default function FlashcardApp() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllQuestions()
      .then(setQuestions)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

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
    historyEntries,
    historyDetailEntry,
    startPlay,
    startReviewByFilter,
    startReviewByRange,
    startNewByRange,
    startHistoryList,
    selectHistoryEntry,
    backToHistoryList,
    backToMenu,
    goToFilterPick,
    goToReviewPick,
    goToNewPick,
    goToHistoryPick,
    goToAnalytics,
    handleNext,
  } = useQuizSession(questions);

  const pageClassName =
    "min-h-dvh flex flex-col items-center justify-start sm:justify-center gap-8 px-4 pt-16 pb-[calc(4rem+env(safe-area-inset-bottom))]";

  if (error) {
    return (
      <div className={pageClassName}>
        <SignOutButton />
        <p className="font-pixel text-sm text-[var(--text-navy)] text-center leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className={pageClassName}>
      <SignOutButton />

      {questions && view === "menu" && (
        <div className="view-fade-in w-full max-w-sm">
          <PixelWindow title="MENU.EXE">
            <Landing
              onSelectPlay={() => startPlay()}
              onSelectFilter={goToFilterPick}
              onSelectReview={goToReviewPick}
              onSelectNew={goToNewPick}
              onSelectHistory={goToHistoryPick}
              onSelectAnalytics={goToAnalytics}
            />
          </PixelWindow>
        </div>
      )}

      {view === "filterPick" && questions && (
        <PickerScreen title="FILTER.EXE" notice={notice}>
          <FilterMode questions={questions} onPlay={startPlay} onMostWrong={startReviewByFilter} onBack={backToMenu} />
        </PickerScreen>
      )}

      {view === "reviewPick" && (
        <PickerScreen title="REVIEW.EXE" notice={notice}>
          <ReviewMode onSelect={startReviewByRange} onBack={backToMenu} />
        </PickerScreen>
      )}

      {view === "newPick" && (
        <PickerScreen title="NEW.EXE" notice={notice}>
          <NewMode onSelect={startNewByRange} onBack={backToMenu} />
        </PickerScreen>
      )}

      {view === "historyPick" && (
        <PickerScreen title="HISTORY.EXE" notice={notice}>
          <HistoryMode onSelect={startHistoryList} onBack={backToMenu} />
        </PickerScreen>
      )}

      {view === "historyList" && (
        <div className="view-fade-in w-full max-w-xl">
          <HistoryList entries={historyEntries} onSelect={selectHistoryEntry} onBack={goToHistoryPick} />
        </div>
      )}

      {view === "historyDetail" && historyDetailEntry && (
        <div className="view-fade-in w-full max-w-xl">
          <HistoryDetail
            question={historyDetailEntry.question}
            response={historyDetailEntry.attempt.selectedIndices}
            stats={questionStats?.get(historyDetailEntry.question.id)}
            onBack={backToHistoryList}
          />
        </div>
      )}

      {view === "analytics" && questions && (
        <div className="view-fade-in w-full max-w-xl">
          <Analytics questions={questions} onBack={backToMenu} />
        </div>
      )}

      {view === "finished" && mode && modeTitle && (
        <div className="view-fade-in w-full max-w-xl">
          <FinishedScreen
            title={modeTitle}
            score={score}
            total={queue.length}
            queue={queue}
            answers={answers}
            questionStats={questionStats}
            onBackToMenu={backToMenu}
          />
        </div>
      )}

      {view === "session" && mode && current && (
        <div className="view-fade-in w-full max-w-xl">
          <SessionScreen
            mode={mode}
            current={current}
            index={index}
            queueLength={queue.length}
            stats={questionStats?.get(current.id)}
            onNext={handleNext}
            onBack={backToMenu}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchAllQuestions, Question } from "@/services/questions";
import { getErrorMessage } from "@/lib/errorMessage";
import { useQuizSession, Notice } from "@/hooks/useQuizSession";
import { GoToMenuProvider } from "@/lib/goToMenuContext";
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
import HeaderActions from "@/components/ui/HeaderActions";
import NoticeBanner from "@/components/ui/NoticeBanner";
import { useHasMounted } from "@/lib/useHasMounted";

// A PixelWindow plus its below-the-fold notice banner, for the picker
// screens (filter/review/new/history-pick) that share this exact layout.
// HeaderActions (Home + account/display menu) replaces this window's own
// decorative close button directly -- every screen in this app gets its
// header this way (via this PixelWindow's headerAction, or FlashcardShell/
// TitleBar's own for screens whose main content isn't already a single
// PixelWindow), so there's no separate global header strip anywhere.
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
      <PixelWindow title={title} headerAction={<HeaderActions />}>
        {children}
      </PixelWindow>
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
    goToMenu,
    goToFilterPick,
    goToReviewPick,
    goToNewPick,
    goToHistoryPick,
    goToAnalytics,
    handleNext,
  } = useQuizSession(questions);

  // Session/Analytics have the tallest, most-used content on a mobile
  // screen -- the flat pt-16 every other view uses (sized for the
  // vertically-centered menu/picker dialogs) was pushing the question card
  // noticeably below the fold. sm: centering for larger viewports is
  // unaffected either way.
  //
  // Gated on useHasMounted since `view`'s own initial value already
  // legitimately differs between the server render (always "menu", no
  // `window`) and a client hydrating with a restored non-"menu" view from
  // `history.state` (e.g. a hard refresh while on Analytics) -- branching
  // this div's className on `view` directly would otherwise reproduce that
  // divergence as a real hydration mismatch, not just a hypothetical one.
  const hasMounted = useHasMounted();
  const isTopAligned = hasMounted && (view === "session" || view === "analytics");
  const pageClassName = `min-h-dvh flex flex-col items-center justify-start sm:justify-center gap-8 px-4 ${
    isTopAligned ? "pt-4 sm:pt-16" : "pt-16"
  } pb-[calc(4rem+env(safe-area-inset-bottom))]`;

  if (error) {
    return (
      <div className={pageClassName}>
        <p className="font-pixel text-sm text-[var(--text-navy)] text-center leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  return (
    <GoToMenuProvider goToMenu={goToMenu}>
      <div className={pageClassName}>
        {questions && view === "menu" && (
          <div className="view-fade-in w-full max-w-sm">
            <PixelWindow title="MENU.EXE" headerAction={<HeaderActions />}>
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
            <FilterMode questions={questions} onPlay={startPlay} onMostWrong={startReviewByFilter} />
          </PickerScreen>
        )}

        {view === "reviewPick" && (
          <PickerScreen title="REVIEW.EXE" notice={notice}>
            <ReviewMode onSelect={startReviewByRange} />
          </PickerScreen>
        )}

        {view === "newPick" && (
          <PickerScreen title="NEW.EXE" notice={notice}>
            <NewMode onSelect={startNewByRange} />
          </PickerScreen>
        )}

        {view === "historyPick" && (
          <PickerScreen title="HISTORY.EXE" notice={notice}>
            <HistoryMode onSelect={startHistoryList} />
          </PickerScreen>
        )}

        {view === "historyList" && (
          <div className="view-fade-in w-full max-w-xl">
            <HistoryList entries={historyEntries} onSelect={selectHistoryEntry} />
          </div>
        )}

        {view === "historyDetail" && historyDetailEntry && (
          <div className="view-fade-in w-full max-w-xl">
            <HistoryDetail
              question={historyDetailEntry.question}
              response={historyDetailEntry.attempt.selectedIndices}
              stats={questionStats?.get(historyDetailEntry.question.id)}
            />
          </div>
        )}

        {view === "analytics" && questions && (
          <div className="view-fade-in w-full max-w-xl">
            <Analytics questions={questions} />
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
            />
          </div>
        )}
      </div>
    </GoToMenuProvider>
  );
}

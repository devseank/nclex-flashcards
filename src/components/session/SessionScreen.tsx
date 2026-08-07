"use client";

import QuestionCard from "@/components/session/QuestionCard";
import TitleBar from "@/components/ui/TitleBar";
import AccountMenu from "@/components/auth/AccountMenu";
import { Question } from "@/services/questions";
import { QuestionStats } from "@/services/attempts";
import { SessionMode } from "@/lib/quizLogic";

export default function SessionScreen({
  mode,
  current,
  index,
  queueLength,
  stats,
  onNext,
}: {
  mode: SessionMode;
  current: Question;
  index: number;
  queueLength: number;
  stats?: QuestionStats;
  onNext: (selected: number[]) => void;
}) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-3">
      <TitleBar
        left={mode !== "infinite" ? `${index + 1} / ${queueLength}` : null}
        action={<AccountMenu />}
      />
      <div key={current.id} className="view-fade-in w-full">
        <QuestionCard question={current} onNext={onNext} stats={stats} />
      </div>
    </div>
  );
}

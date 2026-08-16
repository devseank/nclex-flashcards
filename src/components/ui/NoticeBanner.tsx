import { Notice } from "@/hooks/useQuizSession";
import { Trophy, TriangleAlert } from "lucide-react";

export default function NoticeBanner({ notice }: { notice: Notice }) {
  const isError = notice.tone === "error";

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] text-[var(--surface-foreground)] w-full flex items-center justify-center gap-3 py-3">
      {isError ? (
        <TriangleAlert size={16} className="shrink-0" aria-hidden="true" />
      ) : (
        <Trophy size={16} className="shrink-0" aria-hidden="true" />
      )}
      <p className="font-mono text-xs leading-relaxed">{notice.text}</p>
    </div>
  );
}

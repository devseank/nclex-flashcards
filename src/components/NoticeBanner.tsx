import { Notice } from "@/hooks/useQuizSession";

export default function NoticeBanner({ notice }: { notice: Notice }) {
  const isError = notice.tone === "error";

  return (
    <div className="nes-container is-rounded w-full bg-white flex items-center justify-center gap-3 py-3">
      {!isError && <i className="nes-icon trophy is-small shrink-0" />}
      <p className={`font-pixel text-[10px] leading-relaxed ${isError ? "text-red-600" : ""}`}>
        {notice.text}
      </p>
    </div>
  );
}

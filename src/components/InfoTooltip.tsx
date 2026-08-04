export default function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle ml-1">
      <button
        type="button"
        aria-label="What does this chart show?"
        className="w-4 h-4 flex items-center justify-center rounded-full border border-white text-[8px] font-pixel leading-none text-white cursor-help"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded border border-[var(--text-navy-strong)] bg-white p-2 text-[10px] leading-snug text-[var(--text-navy-strong)] opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

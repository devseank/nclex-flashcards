// A standalone title bar -- the same header strip PixelWindow uses for its
// own title row, but as its own bordered box rather than wrapping a body
// underneath. For screens whose main content isn't already a single
// PixelWindow (the live session card, Analytics' stack of stat cards,
// history detail's read-only card), so the account-menu hamburger has a
// proper inline home instead of floating in a separate global header strip
// disconnected from the content below it.
export default function TitleBar({
  left,
  action,
}: {
  left?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] text-[var(--surface-foreground)] w-full">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-wider">{left}</span>
        {action}
      </div>
    </div>
  );
}

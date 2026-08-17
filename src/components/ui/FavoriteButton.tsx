import { Star } from "lucide-react";

// Same icon-button footprint as HomeButton -- a border/surface square that
// only changes color/fill when favorited, using the app's one signal accent
// (already amber/gold) rather than introducing a second accent color for
// "favorited" specifically.
export default function FavoriteButton({
  isFavorited,
  onToggle,
}: {
  isFavorited: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorited}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={`cursor-pointer border border-[var(--border)] bg-[var(--surface)] leading-none p-1.5 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--signal)] ${
        isFavorited ? "text-[var(--signal)]" : "text-[var(--foreground)]"
      }`}
    >
      <Star size={16} fill={isFavorited ? "currentColor" : "none"} />
    </button>
  );
}

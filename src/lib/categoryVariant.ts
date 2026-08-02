const NES_BUTTON_VARIANTS = ["is-primary", "is-success", "is-warning", "is-error"] as const;

export function categoryVariant(category: string): (typeof NES_BUTTON_VARIANTS)[number] {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return NES_BUTTON_VARIANTS[hash % NES_BUTTON_VARIANTS.length];
}

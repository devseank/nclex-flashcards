import { Question } from "@/services/questions";

// Distinct, sorted categories -- the single required, bounded dimension
// every question has exactly one of.
export function getAllCategories(questions: Question[]): string[] {
  return [...new Set(questions.map((q) => q.category))].sort();
}

// Tags that actually appear on at least one question in any of these
// categories. Tags aren't scoped to a single category in the data model
// (the same tag can appear under multiple categories), but a picker
// narrowing "within category X (or Y, or Z)" only wants the ones actually
// relevant there.
export function getTagsForCategories(questions: Question[], categories: string[]): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    if (!categories.includes(q.category)) continue;
    for (const t of q.tags) set.add(t);
  }
  return [...set].sort();
}

// Distinct, sorted tags across every question -- used when no category is
// selected (the filter's tag pool shouldn't be empty just because the
// category facet is at ANY).
export function getAllTags(questions: Question[]): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    for (const t of q.tags) set.add(t);
  }
  return [...set].sort();
}

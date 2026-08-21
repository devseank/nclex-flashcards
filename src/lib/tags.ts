import { QuestionMeta } from "@/services/questions";

// Distinct, sorted categories -- the single required, bounded dimension
// every question has exactly one of.
export function getAllCategories(questions: QuestionMeta[]): string[] {
  return [...new Set(questions.map((q) => q.category))].sort();
}

// Tags that actually appear on at least one question in any of these
// categories. Tags aren't scoped to a single category in the data model
// (the same tag can appear under multiple categories), but a picker
// narrowing "within category X (or Y, or Z)" only wants the ones actually
// relevant there.
export function getTagsForCategories(questions: QuestionMeta[], categories: string[]): string[] {
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
export function getAllTags(questions: QuestionMeta[]): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    for (const t of q.tags) set.add(t);
  }
  return [...set].sort();
}

// Distinct, sorted sources -- which quiz-content batch/export each question
// came from (e.g. "nurselabs", "naxlex"). Unlike category/tags, this is
// provenance rather than subject matter, but the same "whatever strings
// appear in the data are the list" pattern applies -- no fixed taxonomy.
export function getAllSources(questions: QuestionMeta[]): string[] {
  return [...new Set(questions.map((q) => q.source))].sort();
}

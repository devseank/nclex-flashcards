import { Question } from "@/services/questions";

// Distinct, sorted categories -- the single required, bounded dimension
// every question has exactly one of.
export function getAllCategories(questions: Question[]): string[] {
  return [...new Set(questions.map((q) => q.category))].sort();
}

// Tags that actually appear on at least one question in this category.
// Tags aren't scoped to a single category in the data model (the same tag
// can appear under multiple categories), but a picker narrowing "within
// category X" only wants the ones actually relevant there.
export function getTagsForCategory(questions: Question[], category: string): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    if (q.category !== category) continue;
    for (const t of q.tags) set.add(t);
  }
  return [...set].sort();
}

// A question matches a category (if given) and ALL of the given tags
// (AND/intersection, not "any of") -- picking multiple tags narrows
// further, same as picking a category then a subcategory used to.
export function matchesFilter(question: Question, category: string | null, tags: string[]): boolean {
  return (!category || question.category === category) && tags.every((t) => question.tags.includes(t));
}

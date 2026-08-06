import { Question } from "@/services/questions";
import { QuestionKind, matchesKind } from "@/lib/questionKind";

// One combined query across all three facets a question can be filtered by.
// Each facet is independently optional ("ANY") and all three are OR within
// themselves (see matchesQuestionFilter below) -- a question has exactly one
// category, but the filter can still select several to match any of them.
export type QuestionFilter = {
  categories: string[];
  kinds: QuestionKind[];
  tags: string[];
};

export const EMPTY_FILTER: QuestionFilter = { categories: [], kinds: [], tags: [] };

export function isFilterEmpty(filter: QuestionFilter): boolean {
  return filter.categories.length === 0 && filter.kinds.length === 0 && filter.tags.length === 0;
}

// categories: ANY if empty, else OR -- question's (single) category must be
// one of the selected ones.
// kinds: ANY if empty, else OR -- question must match at least one selected kind.
// tags: ANY if empty, else OR -- question must have at least one selected tag.
// Tags used to be AND (require every selected tag on the same question),
// but most questions carry only 0-1 tags in practice, so requiring 2+ tags
// on one question almost always returned zero results -- OR is both what
// actually surfaces results and what most multi-select tag pickers mean.
function matchesQuestionFilter(question: Question, filter: QuestionFilter): boolean {
  const categoryOk = filter.categories.length === 0 || filter.categories.includes(question.category);
  const kindOk = filter.kinds.length === 0 || filter.kinds.some((k) => matchesKind(question, k));
  const tagsOk = filter.tags.length === 0 || filter.tags.some((t) => question.tags.includes(t));
  return categoryOk && kindOk && tagsOk;
}

// The one seam every call site asks "which questions match this filter?"
// through -- never by inlining `.filter(matchesQuestionFilter)` at the call
// site itself. Today this is a plain client-side filter; if this ever moves
// behind a real backend/API, only this function's body changes (likely to an
// async request) -- no caller needs to change.
export function queryQuestions(pool: Question[], filter: QuestionFilter): Question[] {
  return pool.filter((q) => matchesQuestionFilter(q, filter));
}

const KIND_SHORT_LABELS: Record<QuestionKind, string> = {
  single: "SINGLE",
  sata: "SATA",
  sequence: "SEQUENCE",
  grid: "GRID",
};

// Builds the human-readable session/filter label, e.g.
// "Pharmacology — SINGLE, SATA — Cardiovascular, Endocrine". Omits any facet
// left at ANY. Returns null for an entirely empty filter (the plain PLAY
// case), same as today's category-only label did.
export function describeFilter(filter: QuestionFilter): string | null {
  const parts: string[] = [];
  if (filter.categories.length > 0) parts.push(filter.categories.join(", "));
  if (filter.kinds.length > 0) parts.push(filter.kinds.map((k) => KIND_SHORT_LABELS[k]).join(", "));
  if (filter.tags.length > 0) parts.push(filter.tags.join(", "));
  return parts.length > 0 ? parts.join(" — ") : null;
}

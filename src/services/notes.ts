import { supabase, fetchAllRows } from "@/lib/supabase";

// `user_id` is never passed from the client on insert/update -- the column
// defaults to auth.uid() and RLS scopes every select/insert/update/delete
// to `user_id = auth.uid()`, same as favorites/attempts. See
// supabase/schema.sql.

// A note has no separate tags table -- `tag` is a plain string, freeform,
// scoped to nothing but this one input slot. See
// docs/adr/0001-freeform-note-tags-no-lookup-table.md.
export type NoteInput = { text: string; tag: string | null };

// Doesn't exist until the first save; deleted again the moment its
// `inputs` would otherwise be entirely blank. See
// docs/adr/0002-note-row-lifecycle.md.
export type Note = {
  id: number;
  questionId: number;
  inputs: NoteInput[];
  updatedAt: string;
};

// The NOTES.EXE list and the detail page's NEXT cursor both need a
// question preview alongside the note itself -- pulled in one round trip
// via Supabase's embedded-resource select (the same feature already used
// for questions' own cloze_blanks join).
export type NoteListEntry = Note & { category: string; questionText: string };

type NoteRow = {
  id: number;
  question_id: number;
  inputs: NoteInput[];
  updated_at: string;
};

type NoteListRow = NoteRow & { questions: { category: string; question: string } | null };

function toNote(row: NoteRow): Note {
  return { id: row.id, questionId: row.question_id, inputs: row.inputs, updatedAt: row.updated_at };
}

function toNoteListEntry(row: NoteListRow): NoteListEntry {
  return { ...toNote(row), category: row.questions?.category ?? "", questionText: row.questions?.question ?? "" };
}

export async function fetchNoteForQuestion(questionId: number): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, question_id, inputs, updated_at")
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw error;
  return data ? toNote(data as NoteRow) : null;
}

// Batched version of fetchNoteForQuestion -- only ids that actually have a
// Note come back, consistent with the create-on-demand model (a question
// with no note simply isn't in the result).
export async function fetchNotesForQuestions(questionIds: number[]): Promise<Note[]> {
  if (questionIds.length === 0) return [];
  const data = await fetchAllRows<NoteRow>((from, to) =>
    supabase
      .from("notes")
      .select("id, question_id, inputs, updated_at")
      .in("question_id", questionIds)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return data.map(toNote);
}

// Every note this user has, full body included -- backs the "always fetch
// notes alongside questions" eager mount load in useQuizSession, so a
// revealed answer's note preview never waits on its own per-question
// round trip. Same "cheap, one user's own count is inherently small"
// reasoning as fetchNoteTagVocabulary above, just without narrowing to
// the `inputs` column since callers need the full Note here.
export async function fetchAllNotes(): Promise<Note[]> {
  const data = await fetchAllRows<NoteRow>((from, to) =>
    supabase.from("notes").select("id, question_id, inputs, updated_at").order("id", { ascending: true }).range(from, to),
  );
  return data.map(toNote);
}

// NOTES.EXE's list query -- real page-by-page pagination (the first in
// this app; every other list either drains everything via fetchAllRows or
// does a top-N slice like HISTORY's limit picker), sorted most-recently-
// touched first. `id desc` is a tiebreaker for same-timestamp rows, not
// just tidiness -- it's what makes the sort order stable enough for
// fetchNextNote's cursor below to walk without skipping or repeating rows.
export async function fetchNotesPage(
  pageIndex: number,
  pageSize = 50,
): Promise<{ notes: NoteListEntry[]; totalCount: number }> {
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("notes")
    .select("id, question_id, inputs, updated_at, questions(category, question)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as unknown as NoteListRow[];
  return { notes: rows.map(toNoteListEntry), totalCount: count ?? 0 };
}

// The detail page's NEXT button walks this same (updated_at desc, id desc)
// order via a cursor on the current note, rather than tracking a page
// number -- so it can cross NOTES.EXE's own page boundaries without ever
// knowing what page it's on. `null` means `after` was the last note.
export async function fetchNextNote(after: { updatedAt: string; id: number }): Promise<NoteListEntry | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, question_id, inputs, updated_at, questions(category, question)")
    .or(`updated_at.lt.${after.updatedAt},and(updated_at.eq.${after.updatedAt},id.lt.${after.id})`)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toNoteListEntry(data as unknown as NoteListRow) : null;
}

// Backs the "+ NOTE" affordance -- inserts an all-blank row immediately
// (rather than deferring to first save) so every subsequent persistence
// point (autosave, SAVE, navigate-away) can be a plain UPDATE by this id,
// with no insert-vs-update branch. See
// docs/adr/0002-note-row-lifecycle.md.
//
// The caller always checks fetchNoteForQuestion first, but that
// check-then-insert isn't atomic -- two near-simultaneous calls (React
// StrictMode's dev-only double-effect-invoke is the common case, a
// double-tap or two open tabs the real-world one) can both see "no note
// yet" and both try to insert. The schema's `unique (user_id, question_id)`
// exists exactly to make the loser's insert fail instead of silently
// creating a second row -- catch that (Postgres error code 23505, unique
// violation) and return the winner's row instead of surfacing a confusing
// "duplicate key" error for what the user experiences as one harmless
// double-click.
export async function createBlankNote(questionId: number): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ question_id: questionId, inputs: [] })
    .select("id, question_id, inputs, updated_at")
    .single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const existing = await fetchNoteForQuestion(questionId);
      if (existing) return existing;
    }
    throw error;
  }
  return toNote(data as NoteRow);
}

// The one flush function every persistence point calls (debounce timeout,
// explicit SAVE, navigate-away) -- implements the delete-on-blank rule
// directly: if every input's text is empty, the row is deleted instead of
// persisted empty, symmetric with how it came into being. See
// docs/adr/0002-note-row-lifecycle.md.
export async function saveNote(noteId: number, inputs: NoteInput[]): Promise<Note | null> {
  const isBlank = inputs.every((i) => i.text.trim().length === 0);
  if (isBlank) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase
    .from("notes")
    .update({ inputs, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select("id, question_id, inputs, updated_at")
    .single();
  if (error) throw error;
  return toNote(data as NoteRow);
}

// The tag combobox's autocomplete source -- no separate tags table to
// query (see docs/adr/0001), so the distinct vocabulary is computed
// client-side from every input's tag across the current user's own notes,
// same pattern as src/lib/tags.ts's getAllTags over Question.tags. Cheap:
// this is a metadata-sized fetch (just the `inputs` column), not a body
// fetch, and one user's own note count is inherently small.
export async function fetchNoteTagVocabulary(): Promise<string[]> {
  const data = await fetchAllRows<{ inputs: NoteInput[] }>((from, to) =>
    supabase.from("notes").select("inputs").order("id", { ascending: true }).range(from, to),
  );
  // Tags are free text, so the same word can land in different casings
  // across notes ("Diet" vs "diet"). Rows are fetched oldest-id-first, so
  // keying by lowercase and keeping the first casing seen de-dupes those
  // variants down to whichever spelling was typed first.
  const tags = new Map<string, string>();
  for (const row of data) {
    for (const input of row.inputs) {
      if (input.tag && !tags.has(input.tag.toLowerCase())) {
        tags.set(input.tag.toLowerCase(), input.tag);
      }
    }
  }
  return [...tags.values()].sort();
}

"use client";

import { createContext, useContext } from "react";
import { Note, NoteInput } from "@/services/notes";

// Carries note read/write access down to NotePreview (rendered from deep
// inside FlashcardShell, itself nested in 6 different Flashcard variants,
// itself reused as-is by SessionScreen/HistoryDetail/FavoritesDetail/
// FinishedScreen) and NotesDetail, without threading three callback props
// through every intermediate component signature in between -- same
// rationale as GoToMenuContext just above this file's sibling.
//
// This is also what makes /dev-preview's fixture harness work for inline
// note editing: NotePreview/useNoteEditor never import
// `@/services/notes` directly, so they stay real, unmirrored components --
// only the `api` value passed to the provider differs (real Supabase calls
// in FlashcardApp.tsx, fixture functions in FlashcardAppTest.tsx).
//
// `saveNote` takes `questionId` (not just `noteId`) so the hook that builds
// this api can key its own notesByQuestionId cache update correctly even
// on a delete (where the saved result is `null` and carries no id to key
// by) -- see useQuizSession.ts's saveNoteAndCache.
export type NoteApi = {
  createBlankNote: (questionId: number) => Promise<Note>;
  saveNote: (questionId: number, noteId: number, inputs: NoteInput[]) => Promise<Note | null>;
  fetchNoteTagVocabulary: () => Promise<string[]>;
};

const NoteApiContext = createContext<NoteApi | null>(null);

export function NoteApiProvider({ api, children }: { api: NoteApi; children: React.ReactNode }) {
  return <NoteApiContext.Provider value={api}>{children}</NoteApiContext.Provider>;
}

// Throws rather than falling back to a no-op (unlike useGoToMenu) -- unlike
// the Home button, there's no working fallback behavior for "silently
// don't save this note," so a missing provider should fail loudly during
// development instead of quietly eating edits.
export function useNoteApi(): NoteApi {
  const api = useContext(NoteApiContext);
  if (!api) throw new Error("useNoteApi must be used within a NoteApiProvider");
  return api;
}

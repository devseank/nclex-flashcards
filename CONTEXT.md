# NCLEX Flashcards

A personal NCLEX-RN study app: quiz questions served from Supabase, scored and
scheduled per authenticated user.

## Language

**Note**:
A user's personal annotation attached to at most one Question. Doesn't exist
until the user saves something for that Question for the first time — there
is no Note row for a Question nobody has annotated yet.
_Avoid_: Annotation, comment

**NoteInput**:
One of up to 3 freeform slots within a Note. Each NoteInput holds text and an
optional NoteTag. All 3 are independently optional — a Note can have 1, 2, or
3 filled NoteInputs.

**NoteTag**:
A freeform label classifying what kind of thing a NoteInput captures (e.g.
"trigger", "rule", "miss"). Not a stored entity of its own — there is no
lookup table and no tag id. The set of tags offered for autocomplete is
whatever distinct tag strings already appear across the current user's own
Notes; typing an unseen value simply becomes a new one the next time a Note
is saved. Distinct from `Question.tags`, which classify a Question's subject
matter (e.g. "Cardiovascular") and are a separate, pre-existing concept.
_Avoid_: Tag (ambiguous with `Question.tags`), label

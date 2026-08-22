# Note row lifecycle: insert immediately, delete on blank flush

Pressing "+ NOTE" inserts a `Note` row right away (all 3 `NoteInput`s empty),
rather than deferring the `INSERT` until the first real save. Every
persistence point thereafter — the 1.5s debounced autosave, an explicit
SAVE, and navigating away while mid-edit — runs the same flush routine: if
the current `inputs` are entirely blank, `DELETE` the row; otherwise
`UPSERT` it. So a `Note` still never outlives having real content, just via
delete-on-empty-flush rather than insert-on-first-content.

Considered deferring the row entirely (an unsaved client-side draft,
`INSERT`ing only on first non-empty save) — the original design. Rejected
once autosave entered the picture: inserting immediately means every
autosave/save/flush is a plain `UPDATE` by a known id, with no
insert-vs-update branch in the save path. The cost is a transient blank row
between "+ NOTE" and the first keystroke, which the same delete-on-empty
rule already cleans up if the user abandons it — so the simpler save path
came free.

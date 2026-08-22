# Freeform NoteTag values, no lookup table

Each `NoteInput`'s tag (e.g. "trigger", "rule", "miss") is stored as a plain
string inline in the `Note`'s `inputs` jsonb, not as a foreign key into a
separate tags table with its own id. The autocomplete/dropdown offered while
typing a tag is built by scanning the distinct tag strings already used
across the current user's own Notes, computed at query time rather than
maintained as a normalized entity.

Considered a normalized `note_tags(id, user_id, value)` table with a FK from
each input, which would give referential integrity and cheap global
rename-a-tag support. Rejected: at the scale of one user's personal
vocabulary (dozens of values, not thousands), the migration/join overhead
buys nothing a distinct-value scan doesn't already provide, and it avoids a
second table + a "create tag" mutation that doesn't otherwise need to exist
— saving a Note with a new tag string is how a tag comes into being, full
stop.

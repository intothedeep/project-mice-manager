-- Make slots.label globally unique instead of unique-per-cage (R25).
--
-- WHY: the import pipeline uses slot labels as stable re-import keys. A
-- per-cage unique index (cage_id, label) means that a label collision across
-- cages — e.g. label 'F5' appearing in cages '2413' and '4' (confirmed in the
-- real workbook, 0002:210-212) — is permitted at the DB level but becomes a
-- future blocker if either slot is ever relabelled: the new label must not
-- collide globally so that the re-import key remains unambiguous. Making the
-- label globally unique now closes that class of bug before the relabelling
-- UI ships.
--
-- Partial unique (WHERE deleted_at IS NULL) preserves the tombstone + reimport
-- behaviour: a soft-deleted slot frees its label so the same label can be
-- reused on a new slot without aborts.

DROP INDEX slots_cage_label_key;

CREATE UNIQUE INDEX slots_label_key
    ON slots (label)
    WHERE deleted_at IS NULL;

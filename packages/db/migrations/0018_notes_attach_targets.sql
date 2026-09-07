-- Attach additional target FKs to notes (R25).
--
-- WHY: notes previously could only target a mouse (subject_mouse_id) or a
-- litter (litter_id). Room-level notes ('check food') carry NEITHER, and a note
-- about a cage, colony, or mouse line had nowhere to hang. These four columns
-- round out the target surface without forcing an exclusive-arc CHECK.
--
-- NO "exactly one target" CHECK constraint: the workbook proves multiple
-- simultaneous targets exist (a note about a mouse within a specific litter is
-- subject_mouse_id + litter_id together), and room-level notes have ZERO
-- targets. The constraint was proposed and FALSIFIED in 0005's design; the same
-- reasoning applies here. Service layer is responsible for validating whatever
-- business rule the UI needs.
--
-- Append invariant (service-enforced, not schema-enforced): when a note is
-- edited (new version row sharing origin_note_id), the target FK columns must
-- be carried forward unchanged. A note cannot be retargeted mid-life — that
-- would be a different note. The schema cannot enforce this; the write service
-- must.
--
-- Partial indexes (WHERE <col> IS NOT NULL) let the planner use the index for
-- queries filtered to a specific target type without scanning the majority of
-- rows that have that column NULL.

ALTER TABLE notes
    ADD COLUMN colony_id BIGINT REFERENCES colonies (id),
    ADD COLUMN cage_id   BIGINT REFERENCES cages (id),
    ADD COLUMN line_id   BIGINT REFERENCES mouse_lines (id),
    ADD COLUMN slot_id   BIGINT REFERENCES slots (id);

CREATE INDEX notes_colony_idx
    ON notes (colony_id)
    WHERE colony_id IS NOT NULL;

CREATE INDEX notes_cage_idx
    ON notes (cage_id)
    WHERE cage_id IS NOT NULL;

CREATE INDEX notes_line_idx
    ON notes (line_id)
    WHERE line_id IS NOT NULL;

CREATE INDEX notes_slot_idx
    ON notes (slot_id)
    WHERE slot_id IS NOT NULL;

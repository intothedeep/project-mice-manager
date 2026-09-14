-- Forward migration: rename task_events → tasks; add slot/line subject kinds.
--
-- CHANGES IN THIS FILE:
--   1. Rename task_events table to tasks (and its indexes).
--   2. Update cases.subject_kind CHECK: remove 'room', add 'slot' and 'line'.
--   3. Add subject_slot_id and subject_line_id FK columns on cases.
--   4. Update cases_subject_matches_kind CHECK for 6 kinds.
--   5. Add partial indexes for subject_slot_id and subject_line_id.
--
-- RENAME RATIONALE: task_events is what the REFINED MODEL calls tasks — immutable,
-- append-only status records. Renaming matches the domain language. The ACL
-- (REVOKE UPDATE, DELETE) is preserved automatically on rename; no re-REVOKE needed.
--
-- subject_line_id REFERENCES mouse_lines(id): there is no bare `lines` table.
-- The task spec wrote "REFERENCES lines(id)" — the actual table is mouse_lines.
-- Verified from 0002_core_tables.sql.

-- ---------------------------------------------------------------------------
-- 1. Rename table and indexes
-- ---------------------------------------------------------------------------
ALTER TABLE task_events RENAME TO tasks;

ALTER INDEX task_events_case_idx  RENAME TO tasks_case_idx;
ALTER INDEX task_events_actor_idx RENAME TO tasks_actor_idx;

-- ---------------------------------------------------------------------------
-- 2. Drop the old subject_kind column-level CHECK (auto-named by Postgres)
--    and re-add it with the new 6-value set (no 'room', adds 'slot', 'line').
-- ---------------------------------------------------------------------------
-- The column CHECK on subject_kind is named cases_subject_kind_check by
-- Postgres convention. Drop it and replace with the new value set.
ALTER TABLE cases DROP CONSTRAINT cases_subject_kind_check;

ALTER TABLE cases
    ADD CONSTRAINT cases_subject_kind_check
        CHECK (subject_kind IN ('mouse', 'cage', 'slot', 'litter', 'mate', 'line'));

-- ---------------------------------------------------------------------------
-- 3. Add new FK columns
-- ---------------------------------------------------------------------------
ALTER TABLE cases
    ADD COLUMN subject_slot_id BIGINT REFERENCES slots (id),
    ADD COLUMN subject_line_id BIGINT REFERENCES mouse_lines (id);

-- ---------------------------------------------------------------------------
-- 4. Update the named subject-discriminant CHECK (6 branches, no 'room')
-- ---------------------------------------------------------------------------
-- Drop the old 5-branch check (named in 0021) and replace it.
-- The CASE-with-no-ELSE returns NULL for any unlisted kind, which would pass.
-- The subject_kind CHECK above ensures no unlisted kind can be inserted,
-- so these two constraints work together.
ALTER TABLE cases DROP CONSTRAINT cases_subject_matches_kind;

ALTER TABLE cases
    ADD CONSTRAINT cases_subject_matches_kind CHECK (
        CASE subject_kind
            WHEN 'mouse'  THEN subject_mouse_id IS NOT NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'cage'   THEN subject_cage_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'slot'   THEN subject_slot_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'litter' THEN litter_id        IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'mate'   THEN subject_mate_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'line'   THEN subject_line_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
        END
    );

-- ---------------------------------------------------------------------------
-- 5. Partial indexes for the two new subject columns (mirror existing pattern)
-- ---------------------------------------------------------------------------
CREATE INDEX cases_subject_slot_idx
    ON cases (subject_slot_id)
    WHERE subject_slot_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX cases_subject_line_idx
    ON cases (subject_line_id)
    WHERE subject_line_id IS NOT NULL AND deleted_at IS NULL;

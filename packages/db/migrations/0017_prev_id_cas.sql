-- Optimistic-concurrency CAS on all four versioned tables (R25).
--
-- WHY: the append-only versioned tables (tasks, notes, mates, mice) had no
-- mechanism to prevent two clients from forking off the same head row
-- simultaneously. Both would succeed, producing a diamond in the history that
-- the DISTINCT ON head query resolves arbitrarily. This is a lost-update bug.
--
-- MECHANISM — DB-level compare-and-swap:
--   1. The client reads the current head row; its `id` is the concurrency token.
--   2. The client submits a new version row with prev_id = <that head id>.
--   3. The unique index on (origin_col, prev_id) WHERE deleted_at IS NULL means
--      only ONE row can claim a given prev_id as its predecessor on the active
--      chain. A stale second edit off the same head collides and is rejected.
--   4. The creation row has prev_id NULL and is pinned by the origin self-FK
--      (origin_task_id = id, etc.) instead — NULLs are always distinct in a
--      partial unique index, so multiple creation rows for DIFFERENT logical
--      entities never collide.
--
-- NOTE on mice: two creation rows for the same mouse_meta_id both have prev_id
-- NULL and will NOT collide (NULLs are distinct). The CAS only guards the
-- append chain AFTER the first row; the creation step is guarded by the
-- service-layer idempotency_key unique index (mice_idempotency_key, 0002).
-- This is documented here so a future reviewer does not mistake the NULL gap
-- for an oversight.

-- tasks
ALTER TABLE tasks
    ADD COLUMN prev_id BIGINT REFERENCES tasks (id);

CREATE UNIQUE INDEX tasks_prev_cas_key
    ON tasks (origin_task_id, prev_id)
    WHERE deleted_at IS NULL;

-- notes
ALTER TABLE notes
    ADD COLUMN prev_id BIGINT REFERENCES notes (id);

CREATE UNIQUE INDEX notes_prev_cas_key
    ON notes (origin_note_id, prev_id)
    WHERE deleted_at IS NULL;

-- mates
ALTER TABLE mates
    ADD COLUMN prev_id BIGINT REFERENCES mates (id);

CREATE UNIQUE INDEX mates_prev_cas_key
    ON mates (origin_mate_id, prev_id)
    WHERE deleted_at IS NULL;

-- mice
ALTER TABLE mice
    ADD COLUMN prev_id BIGINT REFERENCES mice (id);

CREATE UNIQUE INDEX mice_prev_cas_key
    ON mice (mouse_meta_id, prev_id)
    WHERE deleted_at IS NULL;

-- Task links and assignment. Separate file because `tasks` (0005) sorts before
-- the breeding tables and cannot reference them inline.
--
-- Repointed by R12 (2026-09-05): the breeding target is `litters`, since
-- `matings` was split into mates + litters. A task about a breeding cycle names
-- the LITTER, which carries that cycle's dates; the couple is reached via
-- litters.mate_id.
ALTER TABLE tasks
    ADD COLUMN litter_id BIGINT REFERENCES litters (id);

CREATE INDEX tasks_litter_idx
    ON tasks (litter_id)
    WHERE litter_id IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Assignment (2026-09-05, user) — who the task is FOR.
-- ---------------------------------------------------------------------------
-- tasks already had created_by / done_by / verified_by, which record who DID
-- something. Nothing recorded who a task was FOR, so every task was unassigned
-- (scenario P2) — in a product whose core is a ticket bin the professor fills
-- for staff to pick up.
--
-- TWO columns, not one, because the `assignables` view cannot be an FK target.
-- The view is only the UI picker; integrity lives on these FKs.
ALTER TABLE tasks
    ADD COLUMN assigned_user_id  BIGINT REFERENCES users (id),
    ADD COLUMN assigned_group_id BIGINT REFERENCES groups (id),
    -- A task goes to one person OR one team, never both. Unassigned is allowed:
    -- the professor drops work into the bin before deciding who takes it.
    ADD CONSTRAINT tasks_one_assignee
        CHECK (assigned_user_id IS NULL OR assigned_group_id IS NULL),
    -- Per-task-type instructions, e.g. {"target_cage":"2482","count":3}.
    -- VALUES ONLY — entity references belong in FK columns above, never here,
    -- or they lose referential integrity.
    ADD COLUMN direction JSONB NOT NULL DEFAULT '{}'::jsonb;

-- "My open tasks" and "my team's open tasks".
CREATE INDEX tasks_assigned_user_idx
    ON tasks (assigned_user_id, status)
    WHERE assigned_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX tasks_assigned_group_idx
    ON tasks (assigned_group_id, status)
    WHERE assigned_group_id IS NOT NULL AND deleted_at IS NULL;

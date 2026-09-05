-- Ticket/task bin — versioned-but-mutable (D1/D2 amendments 2026-09-05).
--
-- task_status_transitions is DROPPED and MERGED INTO tasks. Each row in tasks
-- IS a transition: the first row for a logical task points origin_task_id at
-- itself; subsequent rows share the same origin_task_id and represent edits
-- or status changes.
--
-- An explicit sequence (not GENERATED ALWAYS AS IDENTITY) is required so that
-- the CTE idiom can supply the id when inserting the first row (the self-FK
-- requires the id to be known before insert commits).
--
-- Creation idiom for the first row of a logical task:
--   WITH new_id AS (SELECT nextval('tasks_id_seq') AS id)
--   INSERT INTO tasks (id, origin_task_id, status, from_status, actor_role, ...)
--   SELECT id, id, 'open', NULL, 'professor', ...
--   FROM new_id;
--
-- Subsequent version rows (transitions):
--   INSERT INTO tasks (origin_task_id, status, from_status, actor_role, ...)
--   VALUES (<logical_id>, 'done', 'open', 'staff', ...);

CREATE SEQUENCE tasks_id_seq;

CREATE TABLE tasks (
    id               BIGINT PRIMARY KEY DEFAULT nextval('tasks_id_seq'),
    -- Logical identity. First row: origin_task_id = id (self-referential).
    -- Subsequent rows: origin_task_id = first row's id.
    -- FK is deferred-safe: the CTE supplies id and origin_task_id in the same
    -- statement; Postgres checks FKs at end of statement.
    origin_task_id   BIGINT      NOT NULL REFERENCES tasks (id),
    subject_mouse_id BIGINT REFERENCES mice (id),
    subject_cage_id  BIGINT REFERENCES cages (id),
    litter_id        BIGINT REFERENCES litters (id),
    task_type        TEXT        NOT NULL,
    due_date         DATE,
    -- Transition fields: each row records the state it moves TO and the state
    -- it came FROM. from_status is NULL exactly on the first (creation) row.
    status           task_status NOT NULL,
    from_status      task_status,
    -- Denormalized at transition time: records the role that authorized the
    -- change, which must not be rewritten by a later role change on the user.
    actor_role       TEXT        NOT NULL,
    created_by       BIGINT      NOT NULL REFERENCES users (id),
    done_by          BIGINT REFERENCES users (id),
    verified_by      BIGINT REFERENCES users (id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    done_at          TIMESTAMPTZ,
    verified_at      TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ
);

ALTER SEQUENCE tasks_id_seq OWNED BY tasks.id;

CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- No current_tasks view (removed 2026-09-05, user). Callers write the
-- DISTINCT ON (origin_task_id) ... ORDER BY origin_task_id, id DESC head query
-- themselves; tasks_origin_idx serves it.

-- For upcoming-task view: what is open or done (not yet verified) by due date.
CREATE INDEX tasks_upcoming_idx
    ON tasks (status, due_date)
    WHERE deleted_at IS NULL;

-- Version history for a logical task.
CREATE INDEX tasks_origin_idx
    ON tasks (origin_task_id, id DESC);

-- Retained from original design: fast lookup of tasks for a given mouse.
-- Not in the spec's explicit index list but needed for the cage-grid view
-- (history-from-logs timeline). Kept as self-decided.
CREATE INDEX tasks_subject_mouse_idx
    ON tasks (subject_mouse_id)
    WHERE deleted_at IS NULL;

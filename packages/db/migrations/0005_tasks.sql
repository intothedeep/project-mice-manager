-- Ticket/task bin + its role-carrying timeline (P0.2).

CREATE TABLE tasks (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_mouse_id BIGINT REFERENCES mice (id),
    subject_cage_id  BIGINT REFERENCES cages (id),
    litter_id        BIGINT REFERENCES litters (id),
    task_type        TEXT        NOT NULL,
    title            TEXT        NOT NULL,
    due_date         DATE,
    -- Fast current pointer. The authoritative history is
    -- task_status_transitions; this column is the denormalized head.
    status           task_status NOT NULL DEFAULT 'open',
    created_by       BIGINT      NOT NULL REFERENCES users (id),
    done_by          BIGINT REFERENCES users (id),
    verified_by      BIGINT REFERENCES users (id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    done_at          TIMESTAMPTZ,
    verified_at      TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX tasks_upcoming_idx
    ON tasks (status, due_date)
    WHERE deleted_at IS NULL;

CREATE INDEX tasks_subject_mouse_idx
    ON tasks (subject_mouse_id)
    WHERE deleted_at IS NULL;

-- Append-only. NOT a duplicate of audit_logs: this is purpose-built to carry
-- the role that AUTHORIZED each transition, and is inserted in the SAME
-- transaction as the corresponding audit_logs row.
CREATE TABLE task_status_transitions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id     BIGINT      NOT NULL REFERENCES tasks (id),
    -- NULL exactly on task creation.
    from_status task_status,
    to_status   task_status NOT NULL,
    actor_id    BIGINT      NOT NULL REFERENCES users (id),
    -- DENORMALIZED at transition time on purpose: this records the role that
    -- authorized the change, which must not be rewritten by a later role
    -- change on the user.
    actor_role  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER task_status_transitions_append_only
    BEFORE UPDATE OR DELETE ON task_status_transitions
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE INDEX task_status_transitions_task_idx
    ON task_status_transitions (task_id, created_at, id);

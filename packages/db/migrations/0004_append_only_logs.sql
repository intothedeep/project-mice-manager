-- Append-only log tables (P0.2, plan §4 R7).
--
-- These carry NO deleted_at and are never mutated. The plan mandates every
-- append-only row record WHICH USER did it, so each has a NOT NULL actor
-- reference. Enforcement is a trigger, not convention: "no UPDATE/DELETE path
-- in app code" is not a guarantee, and these rows are the audit trail.

CREATE FUNCTION reject_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        '% is append-only: % is not permitted. Append a new row instead.',
        TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- ALL mutable mouse life-state lives here (R7). One generic log rather than a
-- column per attribute, so adding an attribute needs no migration.
CREATE TABLE mouse_attr_logs (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id   BIGINT      NOT NULL REFERENCES mice (id),
    field      TEXT        NOT NULL CHECK (field IN (
                   'sex', 'mouse_label', 'status', 'attention',
                   'notes', 'genotype_label', 'raw_genotype_correction')),
    value      TEXT,
    actor_id   BIGINT      NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- This is what keeps the enums from 0001 load-bearing rather than decorative:
-- the value domain is enforced on write by casting. An invalid status or sex
-- raises here instead of silently entering the log and corrupting the grid.
CREATE FUNCTION validate_mouse_attr_value() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.value IS NULL THEN
        RETURN NEW;
    END IF;
    CASE NEW.field
        WHEN 'sex'       THEN PERFORM NEW.value::sex;
        WHEN 'status'    THEN PERFORM NEW.value::mouse_status;
        WHEN 'attention' THEN PERFORM NEW.value::attention;
        ELSE NULL;  -- free-text fields (labels, notes, genotype) are unconstrained
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mouse_attr_logs_validate_value
    BEFORE INSERT ON mouse_attr_logs
    FOR EACH ROW EXECUTE FUNCTION validate_mouse_attr_value();

CREATE TRIGGER mouse_attr_logs_append_only
    BEFORE UPDATE OR DELETE ON mouse_attr_logs
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- Serves the "latest value per (mouse, field)" lookup the view performs.
CREATE INDEX mouse_attr_logs_latest_idx
    ON mouse_attr_logs (mouse_id, field, created_at DESC, id DESC);

-- Labels repeat and change (U->M/F, pooled, tag reissue) so this is
-- deliberately NON-unique. It exists for search.
CREATE INDEX mouse_attr_logs_label_search_idx
    ON mouse_attr_logs (value)
    WHERE field = 'mouse_label';

-- Current state = latest row per (mouse, field). The dashboard and the
-- Excel-familiar grid read THIS, never the raw log.
CREATE VIEW mouse_current_attrs AS
SELECT DISTINCT ON (mouse_id, field)
       mouse_id, field, value, actor_id, created_at
FROM mouse_attr_logs
ORDER BY mouse_id, field, created_at DESC, id DESC;

-- Location TRUTH. mice.cage_id / mice.slot_id are a derived cache of the
-- latest row here and must never be hand-edited.
CREATE TABLE mouse_moves (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id        BIGINT      NOT NULL REFERENCES mice (id),
    from_cage_id    BIGINT REFERENCES cages (id),
    to_cage_id      BIGINT REFERENCES cages (id),
    from_slot_id    BIGINT REFERENCES slots (id),
    to_slot_id      BIGINT REFERENCES slots (id),
    moved_by        BIGINT      NOT NULL REFERENCES users (id),
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Stays TEXT in v0.1; promote to an enum once the real vocabulary is known.
    reason          TEXT,
    idempotency_key UUID        NOT NULL UNIQUE
);

CREATE TRIGGER mouse_moves_append_only
    BEFORE UPDATE OR DELETE ON mouse_moves
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE INDEX mouse_moves_history_idx ON mouse_moves (mouse_id, moved_at, id);

CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT      NOT NULL REFERENCES users (id),
    action      TEXT        NOT NULL,
    entity      TEXT        NOT NULL,
    entity_id   BIGINT,
    before_json JSONB,
    after_json  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity, entity_id, created_at);

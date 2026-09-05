-- Log tables (P0.2, plan §4 R7; D1/D2 amendments 2026-09-05).
--
-- D1: append-only is ABANDONED. reject_mutation() and all its triggers are
-- removed. These are now ordinary MUTABLE tables with soft delete.
-- D2: every table gets created_at, updated_at, deleted_at and a set_updated_at
-- trigger (function defined in 0001).
--
-- validate_mouse_attr_value() and its BEFORE INSERT trigger are KEPT: enum-domain
-- validation on write is still required.

-- ALL mutable mouse life-state lives here (R7). One generic log rather than a
-- column per attribute, so adding an attribute needs no migration.
-- 'notes' is DROPPED from the field CHECK: notes move to the notes table (R10).
CREATE TABLE mouse_attr_logs (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id   BIGINT      NOT NULL REFERENCES mice (id),
    field      TEXT        NOT NULL CHECK (field IN (
                   'sex', 'mouse_label', 'status', 'attention',
                   'genotype_label', 'raw_genotype_correction')),
    -- NOT NULL: for field='sex', NULL and 'U' would be two encodings of unknown.
    value      TEXT        NOT NULL,
    actor_id   BIGINT      NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- This is what keeps the enums from 0001 load-bearing rather than decorative:
-- the value domain is enforced on write by casting. An invalid status or sex
-- raises here instead of silently entering the log and corrupting the grid.
CREATE FUNCTION validate_mouse_attr_value() RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.field
        WHEN 'sex'       THEN PERFORM NEW.value::sex;
        WHEN 'status'    THEN PERFORM NEW.value::mouse_status;
        WHEN 'attention' THEN PERFORM NEW.value::attention;
        ELSE NULL;  -- free-text fields (labels, genotype) are unconstrained
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mouse_attr_logs_validate_value
    BEFORE INSERT ON mouse_attr_logs
    FOR EACH ROW EXECUTE FUNCTION validate_mouse_attr_value();

CREATE TRIGGER mouse_attr_logs_set_updated_at
    BEFORE UPDATE ON mouse_attr_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Serves the "latest value per (mouse, field)" lookup the view performs.
CREATE INDEX mouse_attr_logs_latest_idx
    ON mouse_attr_logs (mouse_id, field, created_at DESC, id DESC)
    WHERE deleted_at IS NULL;

-- Labels repeat and change (U->M/F, pooled, tag reissue) so this is
-- deliberately NON-unique. It exists for search.
CREATE INDEX mouse_attr_logs_label_search_idx
    ON mouse_attr_logs (value)
    WHERE field = 'mouse_label' AND deleted_at IS NULL;

-- Current state = latest row per (mouse, field). The dashboard and the
-- Excel-familiar grid read THIS, never the raw log.
CREATE VIEW mouse_current_attrs AS
SELECT DISTINCT ON (mouse_id, field)
       mouse_id, field, value, actor_id, created_at
FROM mouse_attr_logs
WHERE deleted_at IS NULL
ORDER BY mouse_id, field, created_at DESC, id DESC;

-- Location TRUTH. mice.cage_id / mice.slot_id are a derived cache of the
-- latest row here and must never be hand-edited.
-- moved_at is a domain timestamp; created_at/updated_at/deleted_at are the
-- standard infrastructure timestamps per D2.
CREATE TABLE mouse_moves (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id        BIGINT      NOT NULL REFERENCES mice (id),
    from_cage_id    BIGINT REFERENCES cages (id),
    -- Initial placement legitimately has a NULL origin; the DESTINATION never is.
    to_cage_id      BIGINT      NOT NULL REFERENCES cages (id),
    from_slot_id    BIGINT REFERENCES slots (id),
    to_slot_id      BIGINT REFERENCES slots (id),
    actor_id        BIGINT      NOT NULL REFERENCES users (id),
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Stays TEXT in v0.1; promote to an enum once the real vocabulary is known.
    reason          TEXT,
    -- Full unique (not partial): idempotency survives tombstoning.
    idempotency_key UUID        NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER mouse_moves_set_updated_at
    BEFORE UPDATE ON mouse_moves
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX mouse_moves_history_idx
    ON mouse_moves (mouse_id, moved_at, id)
    WHERE deleted_at IS NULL;

CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT      NOT NULL REFERENCES users (id),
    action      TEXT        NOT NULL,
    entity      TEXT        NOT NULL,
    entity_id   BIGINT,
    before_json JSONB,
    after_json  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER audit_logs_set_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity, entity_id, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX audit_logs_actor_idx
    ON audit_logs (actor_id, created_at)
    WHERE deleted_at IS NULL;

-- Cage/slot divergence guard for move history — same rationale as the mice
-- guard in 0002 (composite FK against slots (id, cage_id); MATCH SIMPLE lets
-- a NULL slot_id through, so cage-only moves still record).
ALTER TABLE mouse_moves
    ADD CONSTRAINT mouse_moves_from_slot_cage_agree_fkey
        FOREIGN KEY (from_slot_id, from_cage_id) REFERENCES slots (id, cage_id),
    ADD CONSTRAINT mouse_moves_to_slot_cage_agree_fkey
        FOREIGN KEY (to_slot_id, to_cage_id) REFERENCES slots (id, cage_id);

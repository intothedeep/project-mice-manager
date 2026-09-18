-- Physical ear/toe punches, one row per punch.
--
-- FK targets mouse_meta, NOT mice: `mice` holds VERSION rows (0002:253) — a
-- punch is a fact about the ANIMAL, not about one state of it, so it is not a
-- `mice` column that would need to be carried forward into every new version
-- row (and lost the moment a write forgot to).
CREATE TABLE punches (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id       BIGINT      NOT NULL REFERENCES mouse_meta (id),
    punch_location TEXT        NOT NULL
        CHECK (punch_location IN ('toe', 'ear', 'other')),
    -- WHEN THE PUNCH HAPPENED, not created_at (when the row was written).
    -- created_at DEFAULT now() is TRANSACTION START time (0002:368-378), so the
    -- implicit toe punch and a same-transaction ear punch would share one
    -- created_at and be unorderable against each other.
    effective_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id       BIGINT      NOT NULL REFERENCES users (id),
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

-- Deliberately NO UNIQUE (mouse_id, punch_location): both ears is physically
-- possible. The model is one row per physical punch, not one row per location.

-- 'other' is a PLACEHOLDER pending the lab owner's real third punch location
-- and its label suffix — do not treat it as final vocabulary.

-- No DB trigger mints the default toe punch on mouse_meta insert: that default
-- is a SERVICE-LAYER decision, so a future import path that writes mouse_meta
-- directly (bypassing the service) cannot double-write it.

CREATE INDEX punches_mouse_idx ON punches (mouse_id) WHERE deleted_at IS NULL;

CREATE TRIGGER punches_set_updated_at BEFORE UPDATE ON punches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pup-number offsets: the `+N` tokens in a mouse's label, e.g. 'M1+10+20XXX'.
--
-- WHY THIS EXISTS: the professor's rule is that no two mice may share a pup
-- number inside the same cage or slot. A mouse moved into a cage that already
-- holds its number is bumped with a `+N` OFFSET, assigned on transfer.
-- Offsets ACCUMULATE (M1XXX -> M1+10XXX -> M1+10+20XXX; 1+10 IS 11, written
-- decomposed on purpose so the renumbering stays readable in the name itself).
-- Magnitudes are arbitrary — multiples of 10 are convention, not a rule.
--
-- FK targets mouse_meta, NOT mice (0002:253 — mice holds VERSION rows and
-- cannot be referenced): an offset is a fact ABOUT THE ANIMAL, reachable via
-- mouse_id, not a per-version-row fact that would need carrying forward.
--
-- COLUMNS DELIBERATELY REJECTED (do not re-add):
--
-- * cage_id / slot_id / litter_id / line_id — denormalized copies were
--   considered and DROPPED: `mice` version rows already hold the movement
--   history, and a copy here would be a second source of truth that can
--   disagree with mouse_meta/mice.
-- * pup_number — the birth number lives on mouse_meta and is reachable via
--   mouse_id; no need to repeat it here.
-- * effective_at — dropped. HONEST CONSEQUENCE: for imported historical
--   chains, created_at is the import date, not when the renumber really
--   happened. Accepted, because this table describes WHAT THE NAME IS MADE
--   OF, not WHEN each event occurred.
-- * mouse_version_id / any FK into `mice` — rejected TWICE OVER:
--   (1) 0002_core_tables.sql:253 says mice cannot be referenced, it holds
--       version rows, not stable identities;
--   (2) mice corrections are themselves tombstone + re-insert, so such an FK
--       would be structurally guaranteed to eventually point at a
--       tombstoned row.
-- * prev_id CAS (0017 style) — this is not a versioned entity with a HEAD
--   row that gets superseded in place; each row here is an independent
--   event in a chain, not a chain of corrections to one thing.
--
-- CHAIN ORDER IS `id`, not effective_at (there is none). Identity is
-- monotonic, so insertion order = label order. THE ETL MUST INSERT THE `+N`
-- TOKENS LEFT-TO-RIGHT AS THEY APPEAR IN THE LABEL, so that reading the rows
-- back ORDER BY id reproduces 'M1+10+20XXX' and not some other permutation.
--
-- NO UNIQUENESS CONSTRAINT for "no duplicate pup number per cage/slot" is
-- possible here, and none is added. The effective number is an AGGREGATE
-- across a join (base pup_number on mouse_meta + every offset row for that
-- mouse), the cage lives on `mice` version rows where uniqueness is itself
-- impossible (0002_core_tables.sql:328-329, "no UNIQUE constraint can be
-- placed on a column here, because every version row repeats its value"),
-- and a mouse with no offsets has no row here at all. This is a
-- SERVICE-LAYER check.
CREATE TABLE pup_number_offsets (
    id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id      BIGINT      NOT NULL REFERENCES mouse_meta (id),
    offset_value  INTEGER     NOT NULL CHECK (offset_value > 0),
    actor_id      BIGINT      NOT NULL REFERENCES users (id),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX pup_number_offsets_mouse_idx
    ON pup_number_offsets (mouse_id, id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER pup_number_offsets_set_updated_at
    BEFORE UPDATE ON pup_number_offsets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CORRECTION = TOMBSTONE + INSERT, NEVER UPDATE IN PLACE. Because chain
-- order is `id`, editing offset_value (or reassigning mouse_id) on an
-- existing row silently RENAMES the mouse with no trace that a rename
-- happened. deleted_at / updated_at / note are still mutable in place — a
-- correction is: tombstone the wrong row, insert a replacement row, which
-- naturally sorts after it by id.
--
-- This is the FIRST `RAISE EXCEPTION` trigger in this schema. 0019
-- (audit_logs) achieved immutability with `REVOKE UPDATE, DELETE FROM
-- PUBLIC`, which is UNUSABLE here: removing an offset is a deleted_at
-- tombstone, i.e. an UPDATE, so a blanket UPDATE revoke would also block
-- the one kind of UPDATE this table is supposed to allow. A trigger that
-- inspects WHICH columns changed is the only way to permit tombstoning
-- while still forbidding a rename.
CREATE FUNCTION freeze_pup_number_offsets() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mouse_id IS DISTINCT FROM OLD.mouse_id
    OR NEW.offset_value IS DISTINCT FROM OLD.offset_value THEN
        RAISE EXCEPTION 'pup_number_offsets row % is append-only: tombstone it and insert a replacement', OLD.id
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pup_number_offsets_freeze
    BEFORE UPDATE ON pup_number_offsets
    FOR EACH ROW EXECUTE FUNCTION freeze_pup_number_offsets();

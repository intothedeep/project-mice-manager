-- Core entity tables (P0.2, plan §4 R1/R2/R7/R8/R9/R10).
--
-- Identifier rules in force here:
--   R8 — tables PLURAL, columns and FKs SINGULAR. PK on every table is `id`.
--        The FK to `mice` is `mouse_id` (mouse_seq_id / mouse_ref are retired).
--   R9 — no `litter_seq` column exists anywhere. Litter order is DERIVED from
--        the letter code, length-first (see 0003 for the supporting index).
--   R7 — `mice` holds identity + birth facts ONLY; all mutable life-state
--        lives in mouse_attr_logs (created in 0004).
--   D2 — every table carries created_at, updated_at, deleted_at. set_updated_at()
--        trigger (defined in 0001) is attached to EVERY table here.

-- users is a P0 stub: real identity arrives with Clerk at P2, but the role
-- column is real NOW because task transitions are role-gated from P0-a.
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clerk_user_id TEXT UNIQUE,
    display_name  TEXT        NOT NULL,
    -- Constrained because canTransition(role, ...) is the P0-a authorization
    -- boundary: an unconstrained typo would fail open or closed silently.
    -- Vocabulary unified on 'professor' (2026-09-04) — the P1 genotyping docs
    -- said 'director' for the same person.
    role          TEXT        NOT NULL DEFAULT 'staff'
        CHECK (role IN ('admin', 'professor', 'staff')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Import provenance batch. Created before the domain tables because mutable
-- domain rows carry import_batch_id provenance FKs.
-- imported_at is kept as a domain timestamp; created_at/updated_at are the
-- standard infrastructure timestamps per D2.
CREATE TABLE import_batches (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_filename TEXT        NOT NULL,
    file_sha256     TEXT        NOT NULL,
    sheet_snapshot  JSONB,
    imported_by     BIGINT      NOT NULL REFERENCES users (id),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Partial unique: tombstone + reimport must not abort (D1 soft-delete bug class).
CREATE UNIQUE INDEX import_batches_sha256_key
    ON import_batches (file_sha256)
    WHERE deleted_at IS NULL;

CREATE TRIGGER import_batches_set_updated_at
    BEFORE UPDATE ON import_batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE colonies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER colonies_set_updated_at
    BEFORE UPDATE ON colonies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subcolonies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    colony_id  BIGINT      NOT NULL REFERENCES colonies (id),
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER subcolonies_set_updated_at
    BEFORE UPDATE ON subcolonies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- cage_number is UNIQUE alone (not scoped to subcolony) — plan Q12, low risk
-- and consistent with the workbook's single cage_number_seq.
-- Partial unique: tombstone + reimport must not abort (D1 soft-delete bug class).
CREATE TABLE cages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subcolony_id    BIGINT      NOT NULL REFERENCES subcolonies (id),
    cage_number     TEXT        NOT NULL,
    location        TEXT,
    status          TEXT,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX cages_cage_number_key
    ON cages (cage_number)
    WHERE deleted_at IS NULL;

CREATE TRIGGER cages_set_updated_at
    BEFORE UPDATE ON cages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- slots.label is UNIQUE PER CAGE (not globally) — Q19 EMPIRICALLY FALSIFIED:
-- label 'F5' appears in cages '2413' and '4' in the real workbook (R10).
-- Partial unique: (cage_id, label) WHERE deleted_at IS NULL.
CREATE TABLE slots (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cage_id         BIGINT      NOT NULL REFERENCES cages (id),
    label           TEXT        NOT NULL,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX slots_cage_label_key
    ON slots (cage_id, label)
    WHERE deleted_at IS NULL;

CREATE TRIGGER slots_set_updated_at
    BEFORE UPDATE ON slots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Partial unique: tombstone + reimport must not abort (D1 soft-delete bug class).
CREATE TABLE mouse_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT        NOT NULL,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX mouse_lines_name_key
    ON mouse_lines (name)
    WHERE deleted_at IS NULL;

CREATE TRIGGER mouse_lines_set_updated_at
    BEFORE UPDATE ON mouse_lines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================================================
-- R12 (2026-09-05, user) — breeding chain and the meta/state split.
-- ===========================================================================
-- Two code allocators. Real Postgres SEQUENCEs, not the old single-row counter:
-- nextval is race-free without SELECT ... FOR UPDATE, and the standing warning
-- against deriving the next code from max() still holds.
--   litter_no_seq START 1612 -> first new litter code is BIZ, the bijective
--   base-26 value in the workbook header (B=2,I=9,Z=26 = 2*676+9*26+26).
-- IMPORTED codes supply seq explicitly (computed by the base-26 codec); the ETL
-- then setval()s the sequence above the maximum.
CREATE SEQUENCE litter_no_seq START 1612;
CREATE SEQUENCE mouse_id_seq START 1;
-- Creation order is load-bearing because the chain is CIRCULAR:
--   mates -> mouse_meta -> pups -> litters -> mates
-- Broken with CREATE-then-ALTER, per the standing "FKs are always enforced"
-- rule: litters.mate_id and mates' parent FKs are attached at the bottom.

-- ---------------------------------------------------------------------------
-- mates — the breeding COUPLE. Creating a mate_id IS the act of pairing.
-- ---------------------------------------------------------------------------
-- One row per couple, NOT per cycle: the same pair can produce many litters,
-- and each of those litters carries its own dates. That is what preserves the
-- repeat-cycle history the flat sheet destroys (the negative mating->delivery
-- gap in the R10 analysis).
CREATE TABLE mates (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- FKs added at the bottom: mouse_meta does not exist yet.
    mother_mouse_id BIGINT,
    father_mouse_id BIGINT,
    -- Byte-preserved mate cell, e.g. 'M4BCW Nf1 f/+;ccEGFP', kept when the
    -- father cannot be resolved to a row.
    mate_raw_label  TEXT,
    created_by      BIGINT      NOT NULL REFERENCES users (id),
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- One couple recorded once. coalesce avoids NULL != NULL letting duplicates in
-- when the father is unresolved.
CREATE UNIQUE INDEX mates_couple_key
    ON mates (mother_mouse_id, coalesce(father_mouse_id, -1), coalesce(mate_raw_label, ''))
    WHERE deleted_at IS NULL;

CREATE TRIGGER mates_set_updated_at
    BEFORE UPDATE ON mates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- litters — one birth cycle of one couple.
-- ---------------------------------------------------------------------------
-- A mouse can have MANY litters; a litter has exactly ONE couple (mate_id).
-- litter_no is the professor's letter code ('BCW'), issued per litter — which
-- is what the workbook measurement showed it to be: 37 of 54 Breeders codes are
-- shared by 2-8 mice, and all mice sharing a code have an identical DOB (37/37).
--
-- The cycle dates live HERE, not on mates, precisely because they repeat.
CREATE TABLE litters (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- FK added at the bottom (circular chain).
    mate_id               BIGINT,
    -- COLLATE "C" at DDL time so ordering cannot silently follow the DB default
    -- collation; the CHECK keeps the bijective base-26 codec round-trippable.
    litter_no             TEXT COLLATE "C" NOT NULL CHECK (litter_no ~ '^[A-Z]{1,5}$'),
    -- Base-26 ordinal of litter_no, stored so issue order is ORDER BY seq.
    seq                   BIGINT      NOT NULL DEFAULT nextval('litter_no_seq'),
    line_id               BIGINT REFERENCES mouse_lines (id),
    mated_on              DATE,
    -- true when the source carried '~' (no copulatory plug seen: date estimated).
    is_mated_on_approx    BOOLEAN     NOT NULL DEFAULT false,
    mated_on_raw          TEXT,
    expected_delivery_on  DATE,
    is_expected_delivery_on_approx BOOLEAN NOT NULL DEFAULT false,
    expected_delivery_on_raw TEXT,
    -- Delivered <=> birth_date IS NOT NULL. No outcome enum needed.
    birth_date            DATE,
    pup_count             INTEGER,
    created_by            BIGINT      NOT NULL REFERENCES users (id),
    import_batch_id       BIGINT REFERENCES import_batches (id),
    source_sheet          TEXT,
    source_row            INTEGER,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);

CREATE UNIQUE INDEX litters_litter_no_key
    ON litters (litter_no)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX litters_seq_key
    ON litters (seq)
    WHERE deleted_at IS NULL;

CREATE INDEX litters_mate_idx
    ON litters (mate_id, birth_date DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER litters_set_updated_at
    BEFORE UPDATE ON litters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- pups — one pup slot within one litter.
-- ---------------------------------------------------------------------------
-- pup_number is JUST a distinguishing number inside its litter (Q11 resolved):
-- no birth-order or tag semantics, so NO CHECK on its values.
CREATE TABLE pups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    litter_id       BIGINT      NOT NULL REFERENCES litters (id),
    pup_number      INTEGER     NOT NULL,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX pups_litter_number_key
    ON pups (litter_id, pup_number)
    WHERE deleted_at IS NULL;

CREATE TRIGGER pups_set_updated_at
    BEFORE UPDATE ON pups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- mouse_meta — what the mouse is GIVEN AT BIRTH. Never changes.
-- ---------------------------------------------------------------------------
-- Replaces the former mouse_ids table. One row = one mouse, forever.
-- mouse_id is the mouse's own code ('AAA'..'AAAAA'), unique per MOUSE — as
-- distinct from litters.litter_no, which is shared by the whole litter.
CREATE TABLE mouse_meta (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id        TEXT COLLATE "C" NOT NULL CHECK (mouse_id ~ '^[A-Z]{1,5}$'),
    seq             BIGINT      NOT NULL DEFAULT nextval('mouse_id_seq'),
    -- Which pup of which litter this mouse is. Nullable: imported mice whose
    -- litter is unknown must still be admitted.
    pup_id          BIGINT REFERENCES pups (id),
    sex             TEXT CHECK (sex IN ('M', 'F', 'U')),
    dob             DATE,
    line_id         BIGINT REFERENCES mouse_lines (id),
    -- Byte-preserved source label, e.g. 'M4+10BCW'. The one stable handle for
    -- re-import when parsing is uncertain.
    raw_mouse_id    TEXT,
    raw_genotype    TEXT,
    raw_parents     TEXT,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX mouse_meta_mouse_id_key
    ON mouse_meta (mouse_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX mouse_meta_seq_key
    ON mouse_meta (seq)
    WHERE deleted_at IS NULL;

-- One mouse per pup slot.
CREATE UNIQUE INDEX mouse_meta_pup_key
    ON mouse_meta (pup_id)
    WHERE pup_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER mouse_meta_set_updated_at
    BEFORE UPDATE ON mouse_meta
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- mice — the mouse's UPDATABLE state, APPEND-STYLE.
-- ---------------------------------------------------------------------------
-- An update does NOT modify a row: it INSERTs a new row for the same
-- mouse_meta_id carrying the latest values. The row with the highest id per
-- mouse_meta_id is the current state, so history is free:
--   SELECT DISTINCT ON (mouse_meta_id) *
--   FROM mice WHERE deleted_at IS NULL
--   ORDER BY mouse_meta_id, id DESC;
-- (Served by mice_meta_idx. No view — the current_* views were removed
-- 2026-09-05 by user decision; callers write the head query.)
--
-- NOTE: no UNIQUE constraint can be placed on a column here, because every
-- version row repeats its value. Uniqueness belongs on mouse_meta.
CREATE TABLE mice (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_meta_id   BIGINT      NOT NULL REFERENCES mouse_meta (id),
    cage_id         BIGINT REFERENCES cages (id),
    slot_id         BIGINT REFERENCES slots (id),
    status          TEXT,
    attention       TEXT,
    -- Who wrote this version, and why it superseded the previous one.
    actor_id        BIGINT      NOT NULL REFERENCES users (id),
    change_note     TEXT,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Head-of-history lookup: exactly the DISTINCT ON above.
CREATE INDEX mice_meta_idx
    ON mice (mouse_meta_id, id DESC);

-- Serves the cage-grid view (mice per cage).
CREATE INDEX mice_cage_idx ON mice (cage_id) WHERE deleted_at IS NULL;

CREATE TRIGGER mice_set_updated_at
    BEFORE UPDATE ON mice
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Deferred FKs closing the circular chain.
-- ---------------------------------------------------------------------------
ALTER TABLE mates
    ADD CONSTRAINT mates_mother_mouse_id_fkey
        FOREIGN KEY (mother_mouse_id) REFERENCES mouse_meta (id),
    ADD CONSTRAINT mates_father_mouse_id_fkey
        FOREIGN KEY (father_mouse_id) REFERENCES mouse_meta (id);

ALTER TABLE litters
    ADD CONSTRAINT litters_mate_id_fkey
        FOREIGN KEY (mate_id) REFERENCES mates (id);

-- ---------------------------------------------------------------------------
-- Cage/slot divergence guard
-- ---------------------------------------------------------------------------
-- mice carries BOTH cage_id and slot_id while slots already carries cage_id, so
-- nothing stops a row claiming cage 1 while sitting in a slot of cage 2.
-- Verified by deliberate breakage 2026-09-05: such a row inserted cleanly.
--
-- Dropping mice.cage_id is NOT an option — the Experimental sheet has no Slot
-- column at all, so 117 of its 143 caged mice have a cage and no slot.
--
-- The composite FK fixes it without losing that: MATCH SIMPLE skips the check
-- whenever any referencing column is NULL, so slot_id IS NULL still works, but
-- once a slot IS named its cage must agree.
ALTER TABLE slots
    ADD CONSTRAINT slots_id_cage_key UNIQUE (id, cage_id);

ALTER TABLE mice
    ADD CONSTRAINT mice_slot_cage_agree_fkey
        FOREIGN KEY (slot_id, cage_id) REFERENCES slots (id, cage_id);

-- mouse_moves gets the same guard in 0004, where that table is created.

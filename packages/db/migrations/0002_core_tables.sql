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

-- ---------------------------------------------------------------------------
-- mouse_ids — the letter-code registry (R11, 2026-09-05, user)
-- ---------------------------------------------------------------------------
-- REPLACES the former `litters` and `litter_code_counter` tables.
--
-- The professor issues a letter code ('BCW', 'AZZ') and writes it into every
-- mouse label. It is NOT unique per mouse — measured on Breeders, 37 of 54
-- codes are shared, one by 8 mice, and all mice sharing a code have an
-- IDENTICAL date of birth (37/37, no exceptions). So the code identifies a
-- BIRTH COHORT, and this table holds each code EXACTLY ONCE. Individual mice
-- reference it; the human label 'M4BCW' is composed, never stored:
--     sex ('M') + pup_number (4) + code ('BCW')
--
-- COLLATE "C" is declared at DDL time, not per query: a query that forgot the
-- clause would silently fall back to the DB default collation, and a libc/ICU
-- collation bump could reorder it. The CHECK is load-bearing for the base-26
-- codec round-trip.
--
-- Allocation uses a real Postgres SEQUENCE rather than the old single-row
-- counter: nextval is race-free without SELECT ... FOR UPDATE, and the plan's
-- standing warning against deriving the next code from max() still holds.
-- START 1612 so the first NEWLY issued code is BIZ — bijective base-26
-- (B=2, I=9, Z=26) = 2*676 + 9*26 + 26 = 1612 — matching the workbook header.
-- IMPORTED historical codes supply `seq` explicitly (computed from the code by
-- the base-26 codec); the ETL then setval()s this sequence above the maximum.
CREATE SEQUENCE mouse_id_seq START 1612;

CREATE TABLE mouse_ids (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       TEXT COLLATE "C" NOT NULL CHECK (code ~ '^[A-Z]{1,5}$'),
    -- Bijective base-26 ordinal of `code` (A=1 .. Z=26, AA=27 ...). Stored, not
    -- derived, so issue order is a plain ORDER BY seq. This RETIRES the R9
    -- length-first ordering trick, which existed only because no ordinal was
    -- stored: 'ZZZ' > 'AAAA' lexicographically but 'ZZZ' < 'AAAA' by seq.
    seq        BIGINT      NOT NULL DEFAULT nextval('mouse_id_seq'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Partial unique: tombstone + reimport must not abort (D1 soft-delete bug class).
CREATE UNIQUE INDEX mouse_ids_code_key
    ON mouse_ids (code)
    WHERE deleted_at IS NULL;

-- seq and code must agree one-to-one, or ORDER BY seq would not reproduce
-- issue order.
CREATE UNIQUE INDEX mouse_ids_seq_key
    ON mouse_ids (seq)
    WHERE deleted_at IS NULL;

CREATE TRIGGER mouse_ids_set_updated_at
    BEFORE UPDATE ON mouse_ids
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- mice = identity + birth facts ONLY (R7). Nothing here mutates except
-- deleted_at and the two sanctioned derived-cache columns. There is deliberately
-- NO sex / status / attention / notes / mouse_label / genotype_label column —
-- those live in mouse_attr_logs. There is also NO letter code here: the code is
-- shared with siblings and lives once in mouse_ids, reached via
-- birth_mating_id -> matings.code_id. genotype_parsed and raw_notes are
-- DROPPED (R10): they move to mouse_genotypes and notes respectively.
CREATE TABLE mice (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    line_id         BIGINT REFERENCES mouse_lines (id),
    -- The breeding cycle this mouse was BORN FROM (R11) — replaces litter_id,
    -- since litters merged into matings. FK added in 0007, where matings is
    -- created (circular: matings references mice for mother/father).
    birth_mating_id BIGINT,
    -- pup_number is JUST a distinguishing number within one cohort (Q11
    -- resolved): no birth-order or tag semantics, so NO CHECK on its values.
    pup_number      INTEGER,
    -- The raw source ID string exactly as it appeared in the workbook, e.g.
    -- 'M4+10BCW'. A BIRTH FACT, immutable, byte-preserved. This is the ONLY
    -- stable handle for re-importing pooled and unparseable rows: the rendered
    -- mouse_label lives in mouse_attr_logs and is mutable and non-unique, and
    -- recovering the string from raw_sheet_rows is fragile because row indices
    -- shift between file versions.
    raw_mouse_id    TEXT,
    dob             DATE,
    is_pooled       BOOLEAN     NOT NULL DEFAULT false,
    -- `+N` re-clip notation, multiple reclips PIPE-joined ('6|8'); rendered
    -- with '+' in mouse_label, where '+' is already the separator (Q23).
    reclip_tag      TEXT,
    raw_genotype    TEXT,
    raw_parents     TEXT,
    -- Sanctioned derived cache, rebuilt from mouse_moves. TRUTH is mouse_moves;
    -- never hand-edit these.
    cage_id         BIGINT REFERENCES cages (id),
    slot_id         BIGINT REFERENCES slots (id),
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Natural re-import key. PARTIAL: pooled rows carry no meaningful pup_number
-- and must be admitted, and soft-deleted rows must not block a re-import.
CREATE UNIQUE INDEX mice_cohort_pup_natural_key
    ON mice (birth_mating_id, pup_number)
    WHERE is_pooled = false AND deleted_at IS NULL;

-- Pooled rows are deliberately EXCLUDED from the key above (they share a
-- pup_number by nature), which would otherwise leave them with no uniqueness
-- guard at all and let re-import duplicate them on every run. They are keyed on
-- the raw label instead — the documented pooled re-import path.
CREATE UNIQUE INDEX mice_pooled_raw_key
    ON mice (raw_mouse_id)
    WHERE is_pooled = true AND deleted_at IS NULL;

-- Serves the cage-grid view (mice per cage).
CREATE INDEX mice_cage_idx ON mice (cage_id) WHERE deleted_at IS NULL;

CREATE TRIGGER mice_set_updated_at
    BEFORE UPDATE ON mice
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- mice.birth_mating_id gets its FK in 0007, once matings exists.

-- ---------------------------------------------------------------------------
-- Cage/slot divergence guard (added 2026-09-05)
-- ---------------------------------------------------------------------------
-- mice carries BOTH cage_id and slot_id, and slots already carries cage_id, so
-- nothing stopped a mouse from claiming cage 1 while sitting in a slot that
-- belongs to cage 2. Verified by deliberate breakage: that row inserted cleanly.
--
-- Dropping mice.cage_id is NOT an option — the workbook gives the cage (col D)
-- for mice whose slot is unknown, so cage_id must stand alone.
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

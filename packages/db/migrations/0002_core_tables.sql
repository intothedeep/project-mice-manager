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

-- The litter letter code is the import's ONLY resolution key (R9). It is
-- declared COLLATE "C" AT DDL TIME, not per query: a query that forgets the
-- clause would silently fall back to the DB default collation and skip the
-- ordering index, and a libc/ICU collation bump could reorder it. The CHECK is
-- load-bearing — length-first ordering is equivalent to bijective base-26 order
-- ONLY for ^[A-Z]+$; a lowercase or digit character would break the sort.
-- Partial unique: tombstone + reimport must not abort (D1 soft-delete bug class).
CREATE TABLE litters (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_letter_id TEXT COLLATE "C" NOT NULL
        CHECK (mouse_letter_id ~ '^[A-Z]{1,5}$'),
    line_id         BIGINT REFERENCES mouse_lines (id),
    mother_mouse_id BIGINT,  -- FK added after mice exists (circular reference)
    father_mouse_id BIGINT,  -- FK added after mice exists (circular reference)
    birth_date      DATE,
    pup_count       INTEGER,
    created_by      BIGINT      NOT NULL REFERENCES users (id),
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX litters_mouse_letter_id_key
    ON litters (mouse_letter_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER litters_set_updated_at
    BEFORE UPDATE ON litters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Single-row global counter. This is the ONLY sequence in the system: the
-- per-line mouse_id_sequence was dropped (Q22) and R9 removed litter_seq, which
-- had implicitly been serving as the high-water mark. Allocate under
-- SELECT ... FOR UPDATE inside the create-litter transaction; never derive the
-- next code from SELECT max(...), which races.
CREATE TABLE litter_code_counter (
    id         SMALLINT    PRIMARY KEY CHECK (id = 1),
    next_seq   BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Seeded so the first emitted code is BIZ = bijective base-26 (B=2, I=9, Z=26)
-- = 2*676 + 9*26 + 26 = 1612.
INSERT INTO litter_code_counter (id, next_seq) VALUES (1, 1612);

CREATE TRIGGER litter_code_counter_set_updated_at
    BEFORE UPDATE ON litter_code_counter
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- mice = identity + birth facts ONLY (R7). Nothing here mutates except
-- deleted_at and the two sanctioned derived-cache columns. There is deliberately
-- NO sex / status / attention / notes / mouse_label / genotype_label column —
-- those live in mouse_attr_logs. There is also no mouse_letter_id: litter
-- identity lives on litters. genotype_parsed and raw_notes are DROPPED (R10):
-- they move to mouse_genotypes and notes respectively.
CREATE TABLE mice (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    line_id         BIGINT REFERENCES mouse_lines (id),
    litter_id       BIGINT REFERENCES litters (id),
    -- pup_number is JUST a distinguishing number within one litter (Q11
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
CREATE UNIQUE INDEX mice_litter_pup_natural_key
    ON mice (litter_id, pup_number)
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

-- Deferred because litters and mice reference each other.
ALTER TABLE litters
    ADD CONSTRAINT litters_mother_mouse_id_fkey
        FOREIGN KEY (mother_mouse_id) REFERENCES mice (id),
    ADD CONSTRAINT litters_father_mouse_id_fkey
        FOREIGN KEY (father_mouse_id) REFERENCES mice (id);

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

-- Core entity tables (P0.2, plan §4 R1/R2/R7/R8/R9).
--
-- Identifier rules in force here:
--   R8 — tables PLURAL, columns and FKs SINGULAR. PK on every table is `id`.
--        The FK to `mice` is `mouse_id` (mouse_seq_id / mouse_ref are retired).
--   R9 — no `litter_seq` column exists anywhere. Litter order is DERIVED from
--        the letter code, length-first (see 0003 for the supporting index).
--   R7 — `mice` holds identity + birth facts ONLY; all mutable life-state
--        lives in the append-only mouse_attr_logs (created in 0004).

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
    deleted_at    TIMESTAMPTZ
);

-- Import provenance batch. Created before the domain tables because mutable
-- domain rows carry import_batch_id provenance FKs.
CREATE TABLE import_batches (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_filename TEXT        NOT NULL,
    file_sha256     TEXT        NOT NULL UNIQUE,
    sheet_snapshot  JSONB,
    imported_by     BIGINT      NOT NULL REFERENCES users (id),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE colonies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE subcolonies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    colony_id  BIGINT      NOT NULL REFERENCES colonies (id),
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- cage_number is UNIQUE ALONE (not scoped to subcolony) — plan Q12, low risk
-- and consistent with the workbook's single cage_number_seq.
CREATE TABLE cages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subcolony_id    BIGINT      NOT NULL REFERENCES subcolonies (id),
    cage_number     TEXT        NOT NULL UNIQUE,
    location        TEXT,
    status          TEXT,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- slot.label is UNIQUE GLOBALLY (plan Q19 resolved) — verify the physical
-- oddity at the first real import.
CREATE TABLE slots (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cage_id         BIGINT      NOT NULL REFERENCES cages (id),
    label           TEXT        NOT NULL UNIQUE,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE mouse_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT        NOT NULL UNIQUE,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- The litter letter code is the import's ONLY resolution key (R9). It is
-- declared COLLATE "C" AT DDL TIME, not per query: a query that forgets the
-- clause would silently fall back to the DB default collation and skip the
-- ordering index, and a libc/ICU collation bump could reorder it. The CHECK is
-- load-bearing — length-first ordering is equivalent to bijective base-26 order
-- ONLY for ^[A-Z]+$; a lowercase or digit character would break the sort.
CREATE TABLE litters (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_letter_id TEXT COLLATE "C" NOT NULL UNIQUE
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
    deleted_at      TIMESTAMPTZ
);

-- Single-row global counter. This is the ONLY sequence in the system: the
-- per-line mouse_id_sequence was dropped (Q22) and R9 removed litter_seq, which
-- had implicitly been serving as the high-water mark. Allocate under
-- SELECT ... FOR UPDATE inside the create-litter transaction; never derive the
-- next code from SELECT max(...), which races.
CREATE TABLE litter_code_counter (
    id       SMALLINT PRIMARY KEY CHECK (id = 1),
    next_seq BIGINT NOT NULL
);

-- Seeded so the first emitted code is BIZ = bijective base-26 (B=2, I=9, Z=26)
-- = 2*676 + 9*26 + 26 = 1612.
INSERT INTO litter_code_counter (id, next_seq) VALUES (1, 1612);

-- mice = identity + birth facts ONLY (R7). Nothing here mutates except
-- deleted_at and the two sanctioned derived-cache columns. There is deliberately
-- NO sex / status / attention / notes / mouse_label / genotype_label column —
-- those live in mouse_attr_logs. There is also no mouse_letter_id: litter
-- identity lives on litters.
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
    genotype_parsed JSONB,
    raw_notes       TEXT,
    raw_parents     TEXT,
    -- Sanctioned derived cache, rebuilt from mouse_moves. TRUTH is mouse_moves;
    -- never hand-edit these.
    cage_id         BIGINT REFERENCES cages (id),
    slot_id         BIGINT REFERENCES slots (id),
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- Deferred because litters and mice reference each other.
ALTER TABLE litters
    ADD CONSTRAINT litters_mother_mouse_id_fkey
        FOREIGN KEY (mother_mouse_id) REFERENCES mice (id),
    ADD CONSTRAINT litters_father_mouse_id_fkey
        FOREIGN KEY (father_mouse_id) REFERENCES mice (id);

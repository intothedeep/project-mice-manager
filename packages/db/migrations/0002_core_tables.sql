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
    -- NULL exactly for groups (see the CHECK below). A group does not act, so
    -- it has no authority — leaving it defaulted to 'staff' would put a value
    -- there that reads like permission and is never the one that applies.
    role          TEXT
        CHECK (role IN ('admin', 'professor', 'staff')),
    -- A GROUP IS A USER (2026-09-05, user). Teams live in this table too, so
    -- anything assignable is one row here and `tasks` needs exactly ONE
    -- assignment FK instead of a user column, a group column and a CHECK.
    -- Group-only metadata hangs off `groups`, keyed by this row.
    type          TEXT        NOT NULL DEFAULT 'user'
        CHECK (type IN ('user', 'group')),
    -- A person always has a role; a group never does. AUTHORIZATION ALWAYS
    -- READS THE ACTING PERSON'S ROLE — a task assigned to a group is carried
    -- out by a member, and canTransition judges that member, never the group.
    CONSTRAINT users_role_matches_type CHECK (
        (type = 'user'  AND role IS NOT NULL) OR
        (type = 'group' AND role IS NULL)
    ),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

-- Lets `groups` pin itself to a users row that is actually of type 'group'
-- (composite FK below) — the same device used for cage/slot and litter_code.
ALTER TABLE users ADD CONSTRAINT users_id_type_key UNIQUE (id, type);

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GROUP METADATA ONLY. The group's identity, name and assignability live on
-- its `users` row (type = 'group'); this table carries what is true of groups
-- and not of people.
CREATE TABLE groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      NOT NULL,
    -- Constant, existing only to complete the composite FK: it pins user_id to
    -- a users row whose type really is 'group', so a person cannot be given
    -- group metadata.
    user_type   TEXT        NOT NULL DEFAULT 'group'
        CHECK (user_type = 'group'),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    FOREIGN KEY (user_id, user_type) REFERENCES users (id, type)
);

CREATE UNIQUE INDEX groups_user_key ON groups (user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER groups_set_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE group_members (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id   BIGINT      NOT NULL REFERENCES groups (id),
    user_id    BIGINT      NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX group_members_key
    ON group_members (group_id, user_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER group_members_set_updated_at
    BEFORE UPDATE ON group_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- No `assignables` view any more: with groups living in `users`, the picker is
-- simply `SELECT id, display_name, type, role FROM users WHERE deleted_at IS
-- NULL`, and assignment is one real FK instead of a union of two.

-- Cell signals were an ENUM ('done'|'instruction'|'plan'); promoted to a TABLE
-- 2026-09-05 (user) so the professor can add a signal without a migration, and
-- so the colour it renders as is DATA rather than hardcoded in the client.
CREATE TABLE signals (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type       TEXT        NOT NULL,
    color      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX signals_type_key ON signals (type) WHERE deleted_at IS NULL;

CREATE TRIGGER signals_set_updated_at
    BEFORE UPDATE ON signals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The workbook's font-colour semantics, seeded from meeting_02.
INSERT INTO signals (type, color) VALUES
    ('done',        'black'),
    ('instruction', 'red'),
    ('plan',        'blue');

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

-- A SUBCOLONY IS A MOUSE LINE (2026-09-05, user). One workbook = one colony;
-- its column-B "Mouse line" values ('nNf1 flox;ccEGFP', 'WTs', 'Myrf', ...) are
-- its subcolonies. The separate `mouse_lines` table was the SAME THING under
-- another name and is gone.
--
-- The hierarchy colonies > subcolonies > cages > slots holds exactly:
-- measured on Breeders, all 62 cages belong to exactly ONE line (0 span two).
CREATE TABLE subcolonies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    colony_id  BIGINT      NOT NULL REFERENCES colonies (id),
    -- The line name as the professor writes it, e.g. 'nNf1 flox;ccEGFP'.
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX subcolonies_colony_name_key
    ON subcolonies (colony_id, name)
    WHERE deleted_at IS NULL;

-- Lets litters pin its mice to the same subcolony (composite FK further down).
ALTER TABLE subcolonies ADD CONSTRAINT subcolonies_id_colony_key UNIQUE (id, colony_id);

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

-- ===========================================================================
-- R12 (2026-09-05, user) — breeding chain and the meta/state split.
-- ===========================================================================
-- One code allocator, for the PROFESSOR'S LITTER code (litters.litter_code).
-- A real Postgres SEQUENCE, not a single-row counter: nextval is race-free
-- without SELECT ... FOR UPDATE, and the standing warning against deriving the
-- next code from max() still holds. START 1612 so the first newly issued code
-- is BIZ — bijective base-26 (B=2, I=9, Z=26) = 2*676 + 9*26 + 26 — matching
-- the workbook header. IMPORTED codes are supplied explicitly by the ETL, which
-- then setval()s this sequence above the highest imported ordinal.
CREATE SEQUENCE litter_code_seq START 1612;
-- Creation order is load-bearing because the chain is CIRCULAR:
--   mates -> mouse_meta -> litters -> mates
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
-- The litter carries the professor's letter code (litter_code).
--
-- The cycle dates live HERE, not on mates, precisely because they repeat.
CREATE TABLE litters (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- FK added at the bottom (circular chain).
    mate_id               BIGINT,
    -- The professor's letter code ('BCW'). It belongs HERE, on the litter, not
    -- on the mouse: measured on Breeders, 37 of 54 codes are shared by 2-8 mice
    -- and every mouse sharing a code has an IDENTICAL date of birth (37/37, no
    -- exceptions). Storing it once per litter is also what makes littermate
    -- codes incapable of diverging.
    -- COLLATE "C" at DDL time so ordering cannot silently follow the DB default
    -- collation; the CHECK keeps the bijective base-26 codec round-trippable.
    litter_code           TEXT COLLATE "C" NOT NULL CHECK (litter_code ~ '^[A-Z]{1,5}$'),
    -- Base-26 ordinal of litter_code, stored so issue order is ORDER BY seq.
    seq                   BIGINT      NOT NULL DEFAULT nextval('litter_code_seq'),
    -- The breeding programme (mouse line) this cycle belongs to.
    subcolony_id          BIGINT REFERENCES subcolonies (id),
    mated_on              DATE,
    -- true when the source carried '~' (no copulatory plug seen: date estimated).
    is_mated_on_approx    BOOLEAN     NOT NULL DEFAULT false,
    mated_on_raw          TEXT,
    expected_delivery_on  DATE,
    is_expected_delivery_on_approx BOOLEAN NOT NULL DEFAULT false,
    expected_delivery_on_raw TEXT,
    -- A mouse brought in from OUTSIDE still gets a litter row (2026-09-05,
    -- user), so litter_id/pup_number can be NOT NULL on mouse_meta and the
    -- natural re-import key applies to EVERY mouse. Such a litter has mate_id
    -- NULL (parents unknown) and is flagged here so it is not mistaken for a
    -- birth this colony produced.
    is_from_outside       BOOLEAN     NOT NULL DEFAULT false,
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

CREATE UNIQUE INDEX litters_litter_code_key
    ON litters (litter_code)
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
-- mouse_meta — what the mouse is GIVEN AT BIRTH. Never changes.
-- ---------------------------------------------------------------------------
-- One row = one mouse, forever. This is the stable identity every other table
-- FKs to (`mice` cannot be referenced: it holds version rows).
--
-- IDENTIFICATION (R14, user): `mouse_meta.id` identifies the mouse to US. The
-- professor identifies the same mouse by a COMPOSED label, never stored:
--     sex || pup_number || litters.litter_code   ->  'M' || 4 || 'BCW' = 'M4BCW'
-- litter_code is carried here as a DENORMALIZED copy so the label costs no
-- join; the litter remains its source of truth and a composite FK keeps the two
-- identical. Label uniqueness follows for free from mouse_meta_litter_pup_key
-- plus litters_litter_code_key: one code per litter, one pup_number per mouse
-- in it. Measured: 173 of 173 Breeders labels distinct.
--
-- The `pups` table was folded in here (R13): it held only (litter_id,
-- pup_number), which are mouse attributes.
CREATE TABLE mouse_meta (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Birth cohort — also where this mouse's letter code comes from. NOT NULL:
    -- outside mice get their own litter row (litters.is_from_outside), so every
    -- mouse is covered by the natural re-import key instead of a NULL slipping
    -- past it (scenario P4: F1BAL imported twice produced two rows).
    litter_id       BIGINT      NOT NULL REFERENCES litters (id),
    -- DENORMALIZED copy of litters.litter_code (R15, user), so composing the
    -- professor's label needs no join. It CANNOT drift: the composite FK at the
    -- bottom of this file ties (litter_id, litter_code) to a real litters row,
    -- with ON UPDATE CASCADE so correcting a litter's code rewrites the copies.
    -- MATCH SIMPLE skips the check when litter_id IS NULL, so outside mice
    -- (no litter, no code) still insert.
    litter_code     TEXT COLLATE "C" NOT NULL,
    -- Distinguishing number within its litter (Q11): no birth-order or tag
    -- semantics, so NO CHECK on its values.
    pup_number      INTEGER     NOT NULL,
    -- NO sex column (2026-09-05, user): newborns are 'U' and are sexed later, so
    -- sex is MUTABLE state and lives on `mice`. Keeping it here would have made
    -- a routine correction overwrite birth-given data with no history
    -- (scenario P7).
    dob             DATE,
    -- The breeding programme (mouse line) this mouse belongs to. Birth-given:
    -- it is the litter's programme, pinned by the composite FK below.
    subcolony_id    BIGINT REFERENCES subcolonies (id),
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

-- One mouse per pup slot in a litter.
CREATE UNIQUE INDEX mouse_meta_litter_pup_key
    ON mouse_meta (litter_id, pup_number)
    WHERE deleted_at IS NULL;

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
    -- NULLABLE ON PURPOSE: a newly created mouse gets its state row
    -- immediately with cage/slot NULL ("unplaced") rather than having no row at
    -- all, which made it invisible to every location view (scenario P5).
    cage_id         BIGINT REFERENCES cages (id),
    slot_id         BIGINT REFERENCES slots (id),
    -- Sex moved here from mouse_meta: newborns are 'U' and are sexed later, so
    -- each correction becomes a new version row with its own actor and time.
    -- NOTE: this makes the professor's label (sex||pup_number||litter_code) a
    -- function of CURRENT state, so composing it needs the head row.
    sex             TEXT CHECK (sex IN ('M', 'F', 'U')),
    -- The plain yes/no the cage grid and every filter actually ask.
    is_alive        BOOLEAN     NOT NULL DEFAULT true,
    -- Only meaningful when is_alive = false: 'sac', 'found dead', ...
    death_reason    TEXT,
    CONSTRAINT mice_death_reason_needs_dead
        CHECK (death_reason IS NULL OR is_alive = false),
    attention       TEXT,
    -- Transfer progress for the drag-drop move flow, replacing mouse_moves:
    --   waiting  — a transfer is needed, no destination chosen yet
    --   issued   — requested to a specific cage
    --   moved    — physically moved
    --   verified — confirmed by a professor or manager
    -- DEFAULT 'verified' is the RESTING state: a mouse sitting where it belongs
    -- is not mid-transfer. Import lands rows here directly.
    transit_status  TEXT        NOT NULL DEFAULT 'verified'
        CHECK (transit_status IN ('waiting', 'issued', 'moved', 'verified')),
    -- Why this version exists ('wean', 'import', 'sac'). Was mouse_moves.reason.
    reason          TEXT,
    -- Was mouse_moves.idempotency_key: lets a retried write be recognised
    -- instead of appending a duplicate version row.
    idempotency_key UUID,
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

-- Retry guard inherited from mouse_moves. NOT partial on deleted_at:
-- idempotency must survive tombstoning, or a retry after a soft delete would
-- insert a second copy.
CREATE UNIQUE INDEX mice_idempotency_key
    ON mice (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

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

-- Denormalization guard for mouse_meta.litter_code (R15). Same shape as the
-- cage/slot guard below: the copy is pinned to its source row, so it cannot be
-- set to a code the litter does not have. ON UPDATE CASCADE means a corrected
-- litter code propagates to every mouse in that litter automatically.
ALTER TABLE litters
    ADD CONSTRAINT litters_id_code_key UNIQUE (id, litter_code);

ALTER TABLE mouse_meta
    ADD CONSTRAINT mouse_meta_litter_code_agree_fkey
        FOREIGN KEY (litter_id, litter_code) REFERENCES litters (id, litter_code)
        ON UPDATE CASCADE;

-- A mouse belongs to the same breeding programme as the litter it came from.
-- Same guard shape as litter_code: without it the two could disagree silently.
ALTER TABLE litters
    ADD CONSTRAINT litters_id_subcolony_key UNIQUE (id, subcolony_id);

ALTER TABLE mouse_meta
    ADD CONSTRAINT mouse_meta_subcolony_agree_fkey
        FOREIGN KEY (litter_id, subcolony_id) REFERENCES litters (id, subcolony_id)
        ON UPDATE CASCADE;

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

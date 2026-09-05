-- Genotypes, events, and notes (R10; matings removed by R12 2026-09-05).
--
-- The former `matings` table is GONE: R12 split it into `mates` (the couple)
-- and `litters` (each cycle of that couple), both created in 0002. Nothing
-- here allocates breeding rows any more.

-- ---------------------------------------------------------------------------
-- mouse_genotypes
-- ---------------------------------------------------------------------------
-- Normalized tokenization of col G (GENOTYPE). Real separator is ';' in 110
-- cells, ':' in 6 (typos). Max 3 markers observed ('PlpCre;Nf1 f/+;ccEGFP').
-- order_index is 0-based and is the TOTAL ORDER that makes rendering
-- deterministic: string_agg(marker_text, ';' ORDER BY order_index).
-- This is NOT a biological claim about marker precedence.

CREATE TABLE mouse_genotypes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id        BIGINT      NOT NULL REFERENCES mouse_meta (id),
    -- 0-based position in the source genotype string.
    order_index     SMALLINT    NOT NULL,
    -- One trimmed token, byte-preserved: 'Nf1 f/+', 'ccEGFP(hmo)'.
    marker_text     TEXT        NOT NULL,
    import_batch_id BIGINT REFERENCES import_batches (id),
    source_sheet    TEXT,
    source_row      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER mouse_genotypes_set_updated_at
    BEFORE UPDATE ON mouse_genotypes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX mouse_genotypes_order_key
    ON mouse_genotypes (mouse_id, order_index)
    WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- mouse_events
-- ---------------------------------------------------------------------------
-- ONE ROW PER DATE for tissue_collection (col M, 97% filled) and genotyping
-- (col N, 98% filled). A single cell can hold '260629 260817', which becomes
-- two rows — this is why the dates cannot be columns on mice.

CREATE TABLE mouse_events (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mouse_id            BIGINT          NOT NULL REFERENCES mouse_meta (id),
    kind                mouse_event_kind NOT NULL,
    occurred_on         DATE            NOT NULL,
    -- true when the source string carried a '~' prefix.
    is_occurred_on_approx BOOLEAN       NOT NULL DEFAULT false,
    -- Byte-preserved source cell, e.g. '260629 260817' or '~260629'.
    raw_value           TEXT,
    import_batch_id     BIGINT REFERENCES import_batches (id),
    source_sheet        TEXT,
    source_row          INTEGER,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE TRIGGER mouse_events_set_updated_at
    BEFORE UPDATE ON mouse_events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX mouse_events_kind_date_key
    ON mouse_events (mouse_id, kind, occurred_on)
    WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
-- Versioned-but-mutable, same shape as tasks: each row IS a version.
-- The first row points origin_note_id at itself (via the CTE idiom).
--
-- REDESIGNED 2026-09-05 (user):
--   * subject_mouse_id is NULLABLE. It was NOT NULL, which made a note about a
--     LITTER impossible — and 'no pups' is the single most common note in the
--     workbook, 1023 occurrences (scenario P1). Room-level notes ('check food')
--     have neither a mouse nor a litter.
--   * note_type + meta JSONB: the type says what KIND of note it is, and meta
--     carries that type's own fields without a column per type.
--     GUARDRAIL: meta is for VALUES ONLY. A reference to another entity must be
--     a real FK column — a mouse id buried in JSONB has no integrity and would
--     survive the mouse being deleted, which contradicts the standing
--     "foreign keys are always enforced" decision.
--   * signal_id FKs the `signals` table (was the cell_signal enum).

CREATE SEQUENCE notes_id_seq;

CREATE TABLE notes (
    id               BIGINT PRIMARY KEY DEFAULT nextval('notes_id_seq'),
    -- Logical identity. First row: origin_note_id = id (self-referential).
    origin_note_id   BIGINT      NOT NULL REFERENCES notes (id),
    -- All three subjects are optional: a note may name a mouse, a litter,
    -- both, or neither (a room-level note).
    subject_mouse_id BIGINT REFERENCES mouse_meta (id),
    litter_id        BIGINT REFERENCES litters (id),
    note_type        TEXT        NOT NULL,
    -- Per-type payload. VALUES ONLY — never entity references (see above).
    meta             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    signal_id        BIGINT      NOT NULL REFERENCES signals (id),
    body             TEXT        NOT NULL,
    actor_id         BIGINT      NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

ALTER SEQUENCE notes_id_seq OWNED BY notes.id;

CREATE TRIGGER notes_set_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- No current_notes view (removed 2026-09-05, user) — same call as current_tasks
-- in 0005: callers write the DISTINCT ON head query, notes_origin_idx serves it.

-- Version history for a logical note.
CREATE INDEX notes_origin_idx
    ON notes (origin_note_id, id DESC);

-- Timeline for a mouse's notes.
CREATE INDEX notes_subject_mouse_idx
    ON notes (subject_mouse_id, created_at DESC);

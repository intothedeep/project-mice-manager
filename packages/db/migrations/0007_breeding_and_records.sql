-- Breeding records, genotypes, events, and notes (R10 additions 2026-09-05).
--
-- Creation order is load-bearing (FKs enforced):
--   matings → mouse_genotypes → mouse_events → notes
-- notes references matings; tasks references matings in 0008 (separate file
-- because tasks sorts before matings alphabetically but depends on it).

-- ---------------------------------------------------------------------------
-- matings
-- ---------------------------------------------------------------------------
-- One row per breeding cycle. The real workbook's mating/delivery dates span
-- DIFFERENT cycles than a flat sheet can represent (evidence: negative gap
-- between cols J and L in R10 analysis), so a dedicated table is required.
--
-- mate_mouse_id is NULLABLE BY DESIGN: the mate may be external, deceased, or a
-- typo — a NOT NULL FK would abort the whole import. mate_raw_label preserves
-- the original cell string for resolution or audit.
--
-- Approximate dates: '~' prefix in the real workbook means no copulatory plug
-- was seen — the date is estimated. A DATE alone cannot express this, so each
-- date column has a sibling is_*_approx BOOLEAN and a *_raw TEXT.

CREATE TABLE matings (
    id                           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_mouse_id             BIGINT      NOT NULL REFERENCES mice (id),
    -- Nullable: mate may be unresolved, external, or a data error.
    mate_mouse_id                BIGINT REFERENCES mice (id),
    -- Byte-preserved from col I, e.g. 'M4BCW Nf1 f/+;ccEGFP'.
    mate_raw_label               TEXT,
    -- NO cage_id (decided 2026-09-05, user). The workbook has no "cage where the
    -- mating happened" datum — col D is the mouse's CURRENT cage. Copying it here
    -- would record the wrong thing (mice move after mating) for a column with no
    -- source data. If ever needed it is derivable: mouse_moves at mated_on.
    mated_on                     DATE,
    -- true when the source string carried a '~' prefix (no plug observed).
    is_mated_on_approx           BOOLEAN     NOT NULL DEFAULT false,
    mated_on_raw                 TEXT,
    expected_delivery_on         DATE,
    is_expected_delivery_on_approx BOOLEAN   NOT NULL DEFAULT false,
    expected_delivery_on_raw     TEXT,
    -- The litter this cycle PRODUCED — named baby_litter_id, not litter_id, to
    -- separate it from the birth-litter sense litter_id carries on mice.
    -- Outcome state: delivered <=> baby_litter_id IS NOT NULL. NULL until the
    -- litters row is created at delivery, so no outcome enum is needed.
    baby_litter_id               BIGINT REFERENCES litters (id),
    created_by                   BIGINT      NOT NULL REFERENCES users (id),
    import_batch_id              BIGINT REFERENCES import_batches (id),
    source_sheet                 TEXT,
    source_row                   INTEGER,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                   TIMESTAMPTZ
);

CREATE TRIGGER matings_set_updated_at
    BEFORE UPDATE ON matings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Resolved-pair cycle guard: the same cycle appears on BOTH partners' sheet
-- rows and would otherwise insert twice. coalesce avoids NULL != NULL.
CREATE UNIQUE INDEX matings_resolved_pair_key
    ON matings (
        least(subject_mouse_id, mate_mouse_id),
        greatest(subject_mouse_id, mate_mouse_id),
        coalesce(mated_on, '-infinity'::date)
    )
    WHERE mate_mouse_id IS NOT NULL AND deleted_at IS NULL;

-- Unresolved fallback: when the mate cannot be resolved to a mice row.
CREATE UNIQUE INDEX matings_unresolved_key
    ON matings (
        subject_mouse_id,
        coalesce(mate_raw_label, ''),
        coalesce(mated_on, '-infinity'::date)
    )
    WHERE mate_mouse_id IS NULL AND deleted_at IS NULL;

-- One mating per litter outcome.
CREATE UNIQUE INDEX matings_baby_litter_key
    ON matings (baby_litter_id)
    WHERE baby_litter_id IS NOT NULL AND deleted_at IS NULL;

-- Timeline for a mouse's breeding history.
CREATE INDEX matings_subject_mated_idx
    ON matings (subject_mouse_id, mated_on DESC);

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
    mouse_id        BIGINT      NOT NULL REFERENCES mice (id),
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
    mouse_id            BIGINT          NOT NULL REFERENCES mice (id),
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
-- mating_id is set for col-K "Is it pregnant?" style questions.
-- signal reuses cell_signal enum ('done'|'instruction'|'plan') — the enum
-- already encodes exactly the workbook's colour semantics.

CREATE SEQUENCE notes_id_seq;

CREATE TABLE notes (
    id               BIGINT PRIMARY KEY DEFAULT nextval('notes_id_seq'),
    -- Logical identity. First row: origin_note_id = id (self-referential).
    origin_note_id   BIGINT      NOT NULL REFERENCES notes (id),
    subject_mouse_id BIGINT      NOT NULL REFERENCES mice (id),
    -- Set for notes that pertain to a specific mating cycle.
    mating_id        BIGINT REFERENCES matings (id),
    -- Reuses cell_signal: done=black, instruction=red, plan=blue.
    signal           cell_signal NOT NULL,
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

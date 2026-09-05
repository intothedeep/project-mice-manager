-- Import provenance (P0.2). import_batches itself lives in 0002 because the
-- domain tables carry provenance FKs to it.
--
-- These are MUTABLE tables, deliberately NOT part of the append-only class
-- (import_errors.resolved_at is updated when an error is triaged).

-- Lossless archive of every row of all 9 sheets. The import normalizes only the
-- Breeders sheet in P0-a, but nothing is discarded — a row we cannot parse is
-- still recoverable from here.
CREATE TABLE raw_sheet_rows (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    import_batch_id BIGINT      NOT NULL REFERENCES import_batches (id),
    sheet_name      TEXT        NOT NULL,
    row_index       INTEGER     NOT NULL,
    cells           JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX raw_sheet_rows_batch_idx
    ON raw_sheet_rows (import_batch_id, sheet_name, row_index);

-- The import-error report is a first-class deliverable: a row is NEVER silently
-- dropped. Anything unparseable lands here with enough provenance to find the
-- original cell.
CREATE TABLE import_errors (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    import_batch_id BIGINT      NOT NULL REFERENCES import_batches (id),
    sheet_name      TEXT        NOT NULL,
    row_index       INTEGER     NOT NULL,
    column_name     TEXT,
    raw_value       TEXT,
    rule_violated   TEXT        NOT NULL,
    severity        TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Mutated on triage — which is why this table is not append-only.
    resolved_at     TIMESTAMPTZ,
    resolved_by     BIGINT REFERENCES users (id)
);

CREATE INDEX import_errors_batch_idx
    ON import_errors (import_batch_id, severity)
    WHERE resolved_at IS NULL;

-- Calibration table for the colour->enum mapper (the mapper itself is
-- deferred). Keeping the mapping in DATA rather than code is the point: the
-- professor's palette is discovered empirically, and an unmapped combination
-- must raise flag_for_review rather than default to any enum.
CREATE TABLE color_maps (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scope         TEXT        NOT NULL CHECK (scope IN ('font', 'fill')),
    argb          TEXT,
    theme_index   INTEGER,
    tint          NUMERIC,
    target_enum   TEXT        NOT NULL,
    target_value  TEXT        NOT NULL,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX color_maps_lookup_idx
    ON color_maps (scope, coalesce(argb, ''), coalesce(theme_index, -1), coalesce(tint, 0))
    WHERE deleted_at IS NULL;

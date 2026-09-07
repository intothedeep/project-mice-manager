-- Retire the Excel-import pipeline tables (R25).
--
-- 0006 stays byte-identical on disk (the runner's missing-file guard aborts
-- if a recorded migration disappears), but it is now INERT: raw_sheet_rows,
-- import_errors, color_maps and import_batches are all gone after this file.
-- Do NOT touch 0006.
--
-- Drop order respects the NOT NULL FK chain:
--   raw_sheet_rows.import_batch_id -> import_batches (NOT NULL)
--   import_errors.import_batch_id  -> import_batches (NOT NULL)
--   color_maps has no FK to import_batches (standalone lookup table)
--   import_batches itself last
-- Domain tables shed their import_batch_id FKs in 0009, so no domain table
-- references import_batches at this point.

DROP TABLE raw_sheet_rows;
DROP TABLE import_errors;
DROP TABLE color_maps;
DROP TABLE import_batches;

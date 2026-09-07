-- Remove ETL provenance columns from domain tables (R25).
--
-- The import pipeline is being retired (see 0010). Every domain table that
-- carried (import_batch_id, source_sheet, source_row) must shed those columns
-- so foreign-key constraints to import_batches can be dropped and the table
-- can be dropped in 0010.
--
-- mouse_genotypes and mouse_events still carry these columns at this point;
-- they are renamed / dropped in 0015 and 0016, which sort AFTER this file.
-- Dropping the columns here before renaming / dropping those tables keeps the
-- batch consistent: 0010 can drop import_batches without hitting any FK from
-- a still-alive table.

ALTER TABLE cages
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE slots
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE mouse_meta
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE mice
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE mates
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE litters
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE mouse_genotypes
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

ALTER TABLE mouse_events
    DROP COLUMN import_batch_id,
    DROP COLUMN source_sheet,
    DROP COLUMN source_row;

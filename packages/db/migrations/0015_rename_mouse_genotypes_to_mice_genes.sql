-- Rename mouse_genotypes -> mice_genes and link to the genes catalogue (R25).
--
-- WHY the rename: the table naming convention is PLURAL entity name ('mice',
-- 'mates', 'litters'). 'mouse_genotypes' breaks that convention and couples the
-- name to a field ('genotype') that no longer represents the column structure
-- now that marker_text is being replaced by a FK to genes.
--
-- gene_id references genes (0014). marker_text is dropped: once every row has a
-- gene_id the raw token is redundant and keeping it would create the same
-- two-sources-of-truth hazard that killed mouse_attr_logs (0004 header).
--
-- gene_id is NULLABLE here to allow a data migration to populate it before any
-- NOT NULL enforcement is added in a later migration.
--
-- Index and trigger renames: Postgres lets us rename both without dropping and
-- recreating, which preserves the index's partial predicate and the trigger
-- binding atomically.

ALTER TABLE mouse_genotypes RENAME TO mice_genes;

ALTER TABLE mice_genes
    ADD COLUMN gene_id BIGINT REFERENCES genes (id);

ALTER TABLE mice_genes
    DROP COLUMN marker_text;

-- Rename the unique index so its name matches the new table name.
-- ALTER INDEX ... RENAME preserves the WHERE deleted_at IS NULL predicate.
ALTER INDEX mouse_genotypes_order_key RENAME TO mice_genes_order_key;

-- Rename the set_updated_at trigger so its name stays consistent with every
-- other table's `<table>_set_updated_at` convention.
ALTER TRIGGER mouse_genotypes_set_updated_at ON mice_genes
    RENAME TO mice_genes_set_updated_at;

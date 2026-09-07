-- Finish the mouse_genotypes -> mice_genes rename (R25 cosmetic follow-up).
--
-- 0015 did `ALTER TABLE mouse_genotypes RENAME TO mice_genes`, which renames the
-- TABLE only. Postgres leaves dependent objects on their original names, so the
-- identity sequence, the primary-key constraint (and its backing index) and the
-- mouse_id foreign-key constraint were all still called `mouse_genotypes_*` —
-- harmless, but a reader of SCHEMA.md would see a table whose own constraints
-- name a table that no longer exists. This aligns them.
--
-- Renaming the PK CONSTRAINT also renames its backing index of the same name
-- (they are one object for a constraint-backed index) — verified after applying.
ALTER SEQUENCE mouse_genotypes_id_seq RENAME TO mice_genes_id_seq;

ALTER TABLE mice_genes
    RENAME CONSTRAINT mouse_genotypes_pkey TO mice_genes_pkey;

ALTER TABLE mice_genes
    RENAME CONSTRAINT mouse_genotypes_mouse_id_fkey TO mice_genes_mouse_id_fkey;

-- Normalised gene / marker catalogue (R25).
--
-- WHY: mouse_genotypes (0007) stored the full marker string — including
-- zygosity — as a raw text token in marker_text (e.g. 'Nf1 f/+', 'ccEGFP').
-- That works for display but makes gene-level queries (all mice carrying Nf1,
-- regardless of zygosity) impossible without text pattern matching. The genes
-- table makes the gene a first-class entity so it can carry a human label, a
-- description, and eventually be linked to ontology identifiers.
--
-- code holds the WHOLE marker including zygosity as written by the professor
-- (e.g. 'Nf1 f/+', 'PlpCre', 'ccEGFP(hmo)'). It is the canonical identifier
-- within this lab's vocabulary; two rows with the same code are the same
-- marker. Partial unique WHERE deleted_at IS NULL follows the D1 tombstone rule.
--
-- 0015 adds gene_id to mice_genes (the renamed mouse_genotypes) and drops
-- marker_text; genes rows are expected to be populated by a data migration
-- before that step runs.

CREATE TABLE genes (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT        NOT NULL,
    label       TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX genes_code_key
    ON genes (code)
    WHERE deleted_at IS NULL;

CREATE TRIGGER genes_set_updated_at
    BEFORE UPDATE ON genes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

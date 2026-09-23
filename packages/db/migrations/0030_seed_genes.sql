-- Seed the gene/marker CATALOGUE. Reference data the schema is meaningless
-- without: mice_genes.gene_id is an FK to genes, so with an empty catalogue no
-- mouse can carry a genotype at all. Same class as the system user seeded by
-- 0022, and this file follows its conventions.
--
-- WHY A MIGRATION (owner, 2026-09-23): 0014 deferred population to "a data
-- migration" that was never written, so nothing in migrations/ ever put a row
-- in `genes`. These five are not sample data; they are the lab's whole
-- vocabulary, and until now they existed only in the mock catalogue
-- (apps/colony_client_web/apis/getGenes.mock.api.ts), which no database can
-- read. The codes and labels below are copied FROM that mock so the mock and
-- the real schema stay one contract (MVP1 ladder: schema is the single
-- contract).
--
-- NO sort_key HERE, AND THAT IS THE POINT. This migration runs BEFORE
-- 0031_gene_sort_key.sql, so the column does not exist yet and cannot be
-- supplied even if we wanted to: 0031's UPDATE is what assigns the five values,
-- and it is the ONLY place in migrations/ they appear. The alternative
-- considered and rejected (owner ruling, 2026-09-23) was to seed AFTER 0031,
-- which would have forced this file to carry its own copy of 10/20/30/40/50 and
-- left 0031's UPDATE matching zero rows forever — a second home for a value we
-- have already had to de-duplicate three times in this arc.
--
-- The ordering cost a RENAME: the runner takes files in filename order and
-- requires ^\d{4}_ (packages/db/src/migrate.ts), so there is no slot between
-- 0029 and the sort_key migration. It was free to take because nothing in
-- migrations/ has ever been applied — no schema_migrations row, no checksum, no
-- deployed database to diverge.
--
-- CODES ARE BARE (0029): zygosity is a fact about a mouse's copy of a gene and
-- lives on mice_genes.allele_mat/allele_pat, maternal first. 'Nf1 f/+' is NOT a
-- catalogue code and inserting one here would be the 0014-era model returning —
-- and would make 0031's SET NOT NULL fail loudly, which is by design.
--
-- 'WT' is a REAL row: a mouse known to be wild type carries a WT row, while a
-- mouse with NO rows is "not genotyped". Modelling WT as the empty set would
-- collapse those two facts.
--
-- IDEMPOTENT: genes_code_key (0014) is a PARTIAL unique index
-- (WHERE deleted_at IS NULL), so the conflict target must repeat that predicate
-- for Postgres to infer the index. DO NOTHING, as in 0022 -- a LIVE row is left
-- exactly as it is, including a label an operator has since edited.
-- SAY WHAT THE PARTIAL INDEX ACTUALLY DOES, because it is not obvious: a
-- TOMBSTONED row is not under that index, so it does NOT conflict and this
-- INSERT would create a fresh LIVE row beside it. That is the intended reading
-- (a deleted catalogue entry is not a reason for the colony to have no `Nf1`),
-- and it can only arise from a manual `psql -f` -- the runner records the
-- filename in schema_migrations and never re-runs it.
--
-- Row order is the mock array's order, so a fresh database's generated ids come
-- out 1..5 matching the mock's geneId. INCIDENTAL, not a contract — nothing
-- may depend on a gene's numeric id; `code` is the identifier.

INSERT INTO genes (code, label)
VALUES ('Nf1', 'Neurofibromin 1 (floxed)'),
       ('PlpCre', 'Plp1-CreERT2 driver'),
       ('Ai14', 'Ai14 tdTomato reporter'),
       ('ccEGFP', 'Cre-conditional EGFP reporter'),
       ('ccEGFP(hmo)', 'Cre-conditional EGFP reporter, homozygous'),
       ('WT', 'Wild type (no marker)')
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

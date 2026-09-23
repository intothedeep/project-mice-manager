-- Display order of a gene moves OFF the per-mouse row and ONTO the catalogue.
--
-- NOT RUN against any database by this change (mock era, MVP1).
--
-- 0029_mice_genes_alleles.sql's header points here for the row ORDER: it has
-- been corrected in place (0029 has never been applied to any database) and no
-- longer claims "order_index order". 0014 could not be corrected that way — it
-- IS applied — which is why 0029 carries its correction in prose instead.
--
-- WHY genes.sort_key: how a marker is POSITIONED in a written genotype is a
-- property of the gene, not of one mouse's rows. With order_index, two mice
-- carrying the same two genes could render them in opposite orders, and a
-- re-save could silently reorder a mouse's string. sort_key makes the order a
-- single catalogue fact.
--
-- The VALUES are the lab's own writing order — the professor writes
-- 'PlpCre;Nf1 f/+', which is why PlpCre sorts first. GAPS OF 10 so a future
-- gene can be slotted between two existing ones without renumbering:
--   PlpCre 10, Nf1 20, Ai14 30, ccEGFP 40, WT 50.
--
-- NOT NULL with no default: every catalogue row must declare its position, and
-- any row — LIVE OR TOMBSTONED — whose code is not one of the five above will
-- make the SET NOT NULL below FAIL LOUDLY. That is the intent: a 0014-era code
-- such as 'Nf1 f/+' (zygosity still inside code, superseded by 0029) means the
-- catalogue was never migrated to bare codes, and it must be fixed by hand, not
-- papered over with a nullable column the DTO's `number` would then lie about.
-- The UPDATE therefore carries NO `WHERE deleted_at IS NULL`: SET NOT NULL
-- checks tombstoned rows too, so skipping them would fail on a row this header
-- calls fine. Nothing in migrations/ seeds `genes`, so on a fresh database the
-- UPDATE matches zero rows and the constraint holds trivially.

ALTER TABLE genes
    ADD COLUMN sort_key INTEGER;

UPDATE genes
SET sort_key = CASE code
                   WHEN 'PlpCre' THEN 10
                   WHEN 'Nf1' THEN 20
                   WHEN 'Ai14' THEN 30
                   WHEN 'ccEGFP' THEN 40
                   WHEN 'WT' THEN 50
    END;

ALTER TABLE genes
    ALTER COLUMN sort_key SET NOT NULL;

-- ---------------------------------------------------------------------------
-- mice_genes.order_index is DROPPED
-- ---------------------------------------------------------------------------
-- Owner 2026-09-23: "if we do not use we can delete."
--
-- It had two jobs and has neither left:
--   1. 0007's own header calls it "the TOTAL ORDER that makes rendering
--      deterministic ... NOT a biological claim about marker precedence" —
--      exactly the job genes.sort_key now does, once and for the whole colony.
--   2. "0-based position in the source genotype string" — redundant with
--      mouse_meta.raw_genotype (0002), which keeps the imported cell verbatim
--      and is the handle for re-parsing.
--
-- THIS IS A REAL COLUMN DROP AND IS DESTRUCTIVE: if colony_dev holds imported
-- rows, their source positions are gone. They are recoverable only by
-- re-parsing mouse_meta.raw_genotype.
ALTER TABLE mice_genes
    DROP COLUMN order_index;

-- Dropping the column drops mice_genes_order_key (mouse_id, order_index) with
-- it. Its replacement states the invariant that actually matters: a mouse
-- cannot carry the same gene twice, because zygosity lives on the row — one row
-- per (mouse, gene) is the whole fact. This also closes the [Nf1, Nf1] hole the
-- old key allowed (two rows, different order_index, same gene).
--
-- Partial WHERE deleted_at IS NULL per the D1 tombstone rule, as in 0014. If a
-- mouse already has two LIVE rows for one gene this CREATE FAILS — correct: the
-- duplicate must be tombstoned by hand before the invariant can be declared.
CREATE UNIQUE INDEX mice_genes_mouse_gene_key
    ON mice_genes (mouse_id, gene_id)
    WHERE deleted_at IS NULL;

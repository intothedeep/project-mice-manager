-- A gene's KIND — what sort of marker it is, and therefore how a mouse's two
-- alleles are written.
--
-- NOT RUN against any database by this change (mock era, MVP1).
--
-- WHY: the two kinds need different notation, and nothing in the schema said
-- which a row is.
--   locus     — the edit is at a site the genome already has, so each parent
--               contributes a copy and BOTH copies have a state:
--               'Nf1 f/+', 'Nf1 f/f', 'Ai14 +/-'.
--   transgene — inserted at a random site. There is no pre-existing allele to
--               pair with, so the only facts are one copy or two:
--               'ccEGFP' (one), 'ccEGFP(hmo)' (two, hmo = HOMOZYGOUS).
-- Storage is UNIFORM across both (owner 2026-09-23): the same two columns
-- 0029 added carry everything, and NO new mice_genes column is introduced.
-- 'Tg' is the present allele, and THE ABSENT SIDE IS '+', not a new '0' token:
--   Nf1     f  / +   -> "Nf1 f/+"
--   ccEGFP  Tg / +   -> "ccEGFP"        one copy, from the mother
--   ccEGFP  +  / Tg  -> "ccEGFP"        one copy, from the father
--   ccEGFP  Tg / Tg  -> "ccEGFP(hmo)"   two copies
-- A '0' would be a fifth token meaning "nothing here", sitting beside NULL,
-- which already means "not recorded" — and keeping ABSENT apart from UNKNOWN
-- is the whole reason 0029's columns are nullable. Maternal-first (0029, owner
-- 2026-09-17) therefore carries real information for transgenes too: which
-- parent the insert came from, which the '(hmo)' suffix cannot express.
--
-- CONSEQUENCE, applied here: 'ccEGFP(hmo)' STOPS BEING A CATALOGUE CODE and is
-- removed from 0030's seed (and from 0031's sort_key CASE). Zygosity is a fact
-- about the MOUSE, not about the gene — the same reason 'Nf1 f/+' and
-- 'Nf1 f/f' were never separate catalogue rows. It is expressed as the row
-- ('ccEGFP', 'Tg', 'Tg'). Both files are edited in place rather than corrected
-- here because NEITHER HAS EVER BEEN APPLIED to any database (same ground as
-- 11d0322's in-place fix to 0029); 0014 could not be treated that way.
-- sort_key 45 is simply left unused — the gaps exist so values never have to
-- move, and renumbering would rewrite four stable keys to reclaim one.
--
-- TEXT + CHECK, NOT a CREATE TYPE enum, deliberately. House precedent:
-- punch_location is a CHECK (0026) and 0028 widened it with a two-line
-- DROP + ADD. The CREATE TYPE enums in 0001 are day-one vocabularies that
-- never move; this one is not — the professor has NOT confirmed it, so it must
-- stay cheap to widen.
--
-- 'WT' IS A PLACEHOLDER 'locus'. It is honestly neither: it is the absence of
-- any marker, not an edit at a site and not an insertion. It is filed as
-- 'locus' because a transgene is DEFINED by being an insertion, which WT
-- certainly is not, and because both kinds render a bare code when no alleles
-- are recorded — which is what WT does today and must keep doing. Pending the
-- professor; if a third value is needed, widening the CHECK is the 0028
-- two-liner.
--
-- NOT NULL with no default, exactly as 0031 argues for sort_key: the DTO's
-- `kind` is non-optional, and a nullable column would make it lie. Any row —
-- LIVE OR TOMBSTONED — whose code is not one of the five below leaves kind
-- NULL and makes SET NOT NULL FAIL LOUDLY. That is the intent: an unknown code
-- in `genes` means the catalogue is not the one this migration describes, and
-- it must be fixed by hand. On a fresh database the rows it acts on are
-- exactly the five 0030 seeds.

ALTER TABLE genes
    ADD COLUMN kind TEXT;

UPDATE genes
SET kind = CASE code
               WHEN 'PlpCre' THEN 'transgene'
               WHEN 'Nf1' THEN 'locus'
               WHEN 'Ai14' THEN 'locus'
               WHEN 'ccEGFP' THEN 'transgene'
               WHEN 'WT' THEN 'locus'
    END;

ALTER TABLE genes
    ALTER COLUMN kind SET NOT NULL;

ALTER TABLE genes
    ADD CONSTRAINT genes_kind_check
    CHECK (kind IN ('locus', 'transgene'));

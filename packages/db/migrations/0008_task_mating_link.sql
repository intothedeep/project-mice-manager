-- Task -> breeding-cycle link. Separate file because `tasks` (0005) sorts
-- before the breeding tables and cannot reference them inline.
--
-- Repointed by R12 (2026-09-05): the target is `litters`, since `matings` was
-- split into mates + litters. A task about a breeding cycle names the LITTER,
-- which carries that cycle's dates; the couple is reached via litters.mate_id.
ALTER TABLE tasks
    ADD COLUMN litter_id BIGINT REFERENCES litters (id);

CREATE INDEX tasks_litter_idx
    ON tasks (litter_id)
    WHERE litter_id IS NOT NULL AND deleted_at IS NULL;

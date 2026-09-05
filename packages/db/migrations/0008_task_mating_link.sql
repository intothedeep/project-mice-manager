-- Task→mating link (2026-09-05).
--
-- mating_id cannot be inlined in 0005 because tasks is created before matings
-- (0005 < 0007). Added here as an ALTER TABLE.

ALTER TABLE tasks
    ADD COLUMN mating_id BIGINT REFERENCES matings (id);

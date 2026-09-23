-- Add 'untagged' as a fourth punch_location value (owner decision 2026-09-22).
--
-- Pups sometimes arrive with no physical tag at all. `untagged` is an
-- ORDINARY value of punch_location, nothing special: no sentinel semantics,
-- no coexistence rule with a later real punch, no auto-tombstone, no
-- uniqueness change, no nullability change. `effective_at` records when the
-- observation was true; `actor_id` records who recorded it — exactly like
-- every other punch row.
--
-- Constraint name verified against the live DB before writing this migration
-- (0026_punches.sql predates named-constraint conventions being written down
-- anywhere else): `punches_punch_location_check`.
ALTER TABLE punches DROP CONSTRAINT punches_punch_location_check;

ALTER TABLE punches
    ADD CONSTRAINT punches_punch_location_check
    CHECK (punch_location IN ('toe', 'ear', 'other', 'untagged'));

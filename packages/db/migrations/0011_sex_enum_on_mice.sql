-- Promote mice.sex from TEXT+CHECK to the `sex` enum (R25).
--
-- The inline CHECK (sex IN ('M','F','U')) on mice.sex (0002) is auto-named
-- `mice_sex_check` by Postgres. It must be dropped before the type change
-- because Postgres re-evaluates dependent constraints during ALTER COLUMN TYPE
-- and the text-to-enum cast path can conflict. Once the column IS the enum the
-- constraint is redundant anyway — the enum itself enforces the domain.
--
-- Note: the 0001 comment that says "enforced at the mouse_attr_logs write path"
-- is stale. mouse_attr_logs was dropped in 0004 (it was the EAV log superseded
-- by the mice append-only model). The sex enum is now enforced solely by the
-- column type here.

ALTER TABLE mice DROP CONSTRAINT mice_sex_check;

ALTER TABLE mice
    ALTER COLUMN sex TYPE sex USING sex::sex;

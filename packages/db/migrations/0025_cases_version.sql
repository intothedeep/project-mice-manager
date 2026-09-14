-- Optimistic-concurrency version column on `cases` (user decision 2026-09-14).
--
-- DECISION: case FIELD edits (due_date, assignee, signal, case_type, subject…)
-- are IN-PLACE UPDATEs guarded by a `version` check — NOT append-only version
-- rows. This is a deliberate simpler choice than origin_case_id versioning: it
-- keeps `cases` a STABLE identity row, so gen_key's partial-UNIQUE stays on the
-- immutable row (no return of the R10 "UNIQUE-on-versioned-rows" problem).
--
-- CONCURRENCY (lost-update guard): the editor reads `version`, then submits
--   UPDATE cases
--      SET <changed fields>, version = version + 1
--    WHERE id = :id AND version = :read_version;
-- 0 rows affected  => a concurrent edit already bumped version => CONFLICT;
-- the client re-reads the head and re-applies (409-style optimistic lock).
--
-- STATUS changes are UNCHANGED — they remain append-only via the immutable
-- `tasks` log (each transition = a new row); `current_status` stays a derived
-- head cache. Only the case's own editable fields use this version guard.
--
-- Additive / non-breaking: existing rows default to version 1.

ALTER TABLE cases
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

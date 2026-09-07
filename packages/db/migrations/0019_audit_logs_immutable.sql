-- Make audit_logs truly immutable (R25).
--
-- WHY: an audit log that can be updated or deleted is not an audit log. The
-- updated_at / deleted_at columns and the set_updated_at trigger implied the
-- table was mutable — contradicting its purpose. Removing them closes the door
-- on accidental (or malicious) edits.
--
-- This is a §22.4-sanctioned exception to the soft-delete rule: audit rows are
-- never deleted, not even tombstoned. The table grows only via INSERT.
--
-- request_id: correlation handle tying an audit row to the HTTP request that
-- caused it. Stored as TEXT (UUID or trace-id) rather than a typed column so
-- the format is not locked to one tracing backend.
--
-- on_behalf_of_id: for proxy / impersonation flows where actor_id is the
-- system or an admin acting FOR another user. NULL = not a proxy action.
--
-- Indexes: the old indexes filtered WHERE deleted_at IS NULL, which was correct
-- when deleted_at existed. Dropping deleted_at would leave those predicates
-- referencing a non-existent column and invalidate the indexes, so they must be
-- dropped and recreated without the predicate.
--
-- REVOKE: the .env file is not readable by this agent. The safest blanket
-- revocation is FROM PUBLIC — any explicitly GRANTed role still holds its own
-- privileges; PUBLIC is the implicit baseline inherited by every role that was
-- not explicitly granted. If the app role needs SELECT-only access it should be
-- GRANTed explicitly after this migration runs. The table OWNER retains all
-- privileges regardless (ownership bypasses REVOKE FROM PUBLIC), so the
-- migration connection itself can still INSERT during auditing.

DROP TRIGGER audit_logs_set_updated_at ON audit_logs;

DROP INDEX audit_logs_entity_idx;
DROP INDEX audit_logs_actor_idx;

ALTER TABLE audit_logs
    DROP COLUMN updated_at,
    DROP COLUMN deleted_at,
    ADD COLUMN request_id      TEXT,
    ADD COLUMN on_behalf_of_id BIGINT REFERENCES users (id);

-- Recreated without the deleted_at predicate that was on the originals (0004).
CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity, entity_id, created_at);

CREATE INDEX audit_logs_actor_idx
    ON audit_logs (actor_id, created_at);

-- Prevent any UPDATE or DELETE on this table from any role that is not the
-- table owner. The table owner (the migration connection) retains full access
-- via ownership and is unaffected by this REVOKE.
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

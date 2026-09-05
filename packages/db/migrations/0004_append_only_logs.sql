-- Audit log (P0.2).
--
-- REMOVED 2026-09-05 (user), both by decision and because each was provably a
-- second source of truth:
--
--   mouse_attr_logs — a generic (field, value) EAV for mutable mouse state. It
--     existed because `mice` used to be immutable. R12 made `mice` APPEND-STYLE,
--     so its version rows already carry per-field history, and keeping both meant
--     a reader of mice.status saw 0 dead while the log said 1 (scenario P3).
--
--   mouse_moves — the location history. Same story: consecutive `mice` version
--     rows ARE the move history, and maintaining both required two writes per
--     move with nothing tying them, which measurably drifted (cache said cage
--     2475, history said 2482 — scenario P6). `reason` and `idempotency_key`
--     moved onto `mice`; transfer progress is `mice.in_transit`.
--
-- audit_logs STAYS: it records WHO DID WHAT across every table, which no
-- per-entity version row can answer.

CREATE TABLE audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT      NOT NULL REFERENCES users (id),
    action      TEXT        NOT NULL,
    entity      TEXT        NOT NULL,
    entity_id   BIGINT,
    before_json JSONB,
    after_json  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER audit_logs_set_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity, entity_id, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX audit_logs_actor_idx
    ON audit_logs (actor_id, created_at)
    WHERE deleted_at IS NULL;

-- Cage/slot divergence guard for move history — same rationale as the mice
-- guard in 0002 (composite FK against slots (id, cage_id); MATCH SIMPLE lets
-- a NULL slot_id through, so cage-only moves still record).

-- Drop mouse_events and its enum (R25).
--
-- WHY: tissue_collection and genotyping dates are now recorded as completed
-- `tasks` rows (task_type = 'tissue_collection' or 'genotyping', with the date
-- in due_date / done_at). Keeping mouse_events alongside tasks would create two
-- sources of truth for the same facts — the same problem that killed
-- mouse_attr_logs and mouse_moves (see 0004 header).
--
-- Accepted losses vs. the mouse_events model:
--   * no is_occurred_on_approx ('~' prefix) flag — tasks have no approximation
--     field. Accept this: the '~' appeared in under 5% of cells and the task
--     body / direction JSONB can carry a note if needed.
--   * no raw_value column — the byte-preserved source cell ('260629 260817') is
--     gone. Raw cells are no longer stored once the import pipeline is retired.
--   * no (mouse_id, kind, occurred_on) dedup index — the tasks model deduplicates
--     via idempotency_key on the caller side.
--
-- mouse_event_kind is dropped with the table that was the only column using it.

DROP TABLE mouse_events;
DROP TYPE mouse_event_kind;

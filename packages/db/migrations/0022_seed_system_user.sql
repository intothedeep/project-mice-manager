-- Resolve OPEN QUESTION Q-SYS-USER from 0021.
--
-- Auto-generated cases (daily batch, ETL) require a valid cases.created_by,
-- which is BIGINT NOT NULL REFERENCES users(id). No system/service user existed.
--
-- DECISION: seed one system user with role='admin' (the existing CHECK allows
-- only admin/professor/staff; no new role value is added). Using role='admin'
-- avoids inventing a sentinel role that the canTransition matrix would need
-- to understand.
--
-- SENTINEL IDENTITY: clerk_user_id='system@colony.local', display_name='system'.
-- clerk_user_id is plain UNIQUE (not partial) on the users table — the
-- ON CONFLICT clause below makes this seed idempotent.
--
-- RESOLUTION NOTE: the service layer MUST NOT hardcode the numeric id.
-- Resolve at runtime via:
--   SELECT id FROM users WHERE clerk_user_id = 'system@colony.local'
-- The constant SYSTEM_SENTINEL_CLERK_ID = 'system@colony.local' is documented
-- in apps/colony_server/src/util/systemUser.ts.

INSERT INTO users (clerk_user_id, display_name, role, type)
VALUES ('system@colony.local', 'system', 'admin', 'user')
ON CONFLICT (clerk_user_id) DO NOTHING;

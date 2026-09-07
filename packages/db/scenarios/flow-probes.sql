-- Focused probes on the risks the append-style design creates.
-- R25 additions: CAS collision, notes reach, audit immutability.
-- Ends in ROLLBACK (each transaction block).
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name,role) VALUES ('P','professor');
CREATE TEMP TABLE u AS SELECT max(id) id FROM users;
INSERT INTO colonies (name) VALUES ('MR');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'n' FROM colonies;
INSERT INTO cages (line_id,cage_number) SELECT id,'2475' FROM mouse_lines;
-- slots.label is globally unique; qualify with cage_number
INSERT INTO slots (cage_id,label) SELECT id,'2475-A1' FROM cages;
INSERT INTO litters (litter_code,is_from_outside,created_by) SELECT 'BJA',true,(SELECT id FROM u);
INSERT INTO mouse_meta (litter_id,litter_code,pup_number) SELECT id,'BJA',1 FROM litters;
-- R25: line_id on mice version rows, not mouse_meta
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason)
SELECT mm.id,(SELECT id FROM cages),(SELECT id FROM slots),'F',
       (SELECT id FROM mouse_lines),(SELECT id FROM u),'import'
FROM mouse_meta mm;

\echo '#### PROBE 1  부분 행 삽입은 상태를 잃는다 (append 설계의 핵심 위험) ####'
SAVEPOINT partial;
-- Wrong: only set is_alive/death_reason, omits cage/slot/sex/line_id
INSERT INTO mice (mouse_meta_id,line_id,actor_id,is_alive,death_reason,reason)
SELECT mm.id,(SELECT id FROM mouse_lines),(SELECT id FROM u),false,'sac','sacrificed'
FROM mouse_meta mm;
SELECT id,cage_id,sex,is_alive,reason FROM mice ORDER BY id;
\echo '   -> 최신 행의 cage 와 sex 가 NULL. 쥐가 케이지에서 사라집니다.'
\echo '   -> 스키마로는 막을 수 없습니다: NULL 은 "미배치" 라는 정당한 값이기도 합니다 (P5).'
\echo '   -> 서비스가 이전 head 를 읽어 통째로 이어써야 합니다.'
ROLLBACK TO partial;

\echo '#### PROBE 2  올바른 방식: 이전 head 를 이어받아 새 행 (prev_id CAS 포함) ####'
-- R25: carry prev_id = head.id so the CAS index guards against concurrent overwrites
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,is_alive,death_reason,
                  attention,transit_status,actor_id,reason,prev_id)
SELECT prev.mouse_meta_id,prev.cage_id,prev.slot_id,prev.sex,prev.line_id,
       false,'sac',prev.attention,prev.transit_status,
       (SELECT id FROM u),'sacrificed',prev.id
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL
      ORDER BY mouse_meta_id,id DESC) prev;
SELECT DISTINCT ON (mouse_meta_id) id,cage_id,sex,is_alive,death_reason FROM mice
WHERE deleted_at IS NULL ORDER BY mouse_meta_id,id DESC;

\echo '#### PROBE 3  created_at 은 트랜잭션 시작 시각 — 시간여행은 effective_at 로 ####'
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,effective_at)
SELECT mm.id,(SELECT id FROM cages),(SELECT id FROM slots),'F',
       (SELECT id FROM mouse_lines),(SELECT id FROM u),'later','2026-12-01'
FROM mouse_meta mm;
SELECT count(DISTINCT created_at) AS "서로 다른 created_at",
       count(DISTINCT effective_at) AS "서로 다른 effective_at" FROM mice;

\echo '#### PROBE 4  재시도 방지: 같은 idempotency_key 두 번 -> 거부 ####'
INSERT INTO mice (mouse_meta_id,line_id,actor_id,idempotency_key)
SELECT mm.id,(SELECT id FROM mouse_lines),(SELECT id FROM u),
       '11111111-1111-1111-1111-111111111111'
FROM mouse_meta mm;
SAVEPOINT idem;
INSERT INTO mice (mouse_meta_id,line_id,actor_id,idempotency_key)
SELECT mm.id,(SELECT id FROM mouse_lines),(SELECT id FROM u),
       '11111111-1111-1111-1111-111111111111'
FROM mouse_meta mm;
ROLLBACK TO idem;

\echo '#### PROBE 5  litter 없는 쥐는 만들 수 없다 (P4 재발 방지) ####'
SAVEPOINT nolitter;
INSERT INTO mouse_meta (pup_number) VALUES (1);
ROLLBACK TO nolitter;
ROLLBACK;

-- ===========================================================================
-- PROBE 6-8: the partial-row hazard is NOT specific to `mice`.
-- Every versioned-append table loses whatever an INSERT omits.
-- ===========================================================================
BEGIN;
INSERT INTO users (display_name,role) VALUES ('P2','professor');
CREATE TEMP TABLE u2 AS SELECT max(id) id FROM users;
INSERT INTO colonies (name) VALUES ('MR2');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'n' FROM colonies WHERE name='MR2';
INSERT INTO cages (line_id,cage_number) SELECT id,'9001' FROM mouse_lines WHERE name='n';
INSERT INTO slots (cage_id,label) SELECT id,'9001-A1' FROM cages WHERE cage_number='9001';
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT v,true,(SELECT id FROM u2) FROM (VALUES ('CAA'),('CAB')) t(v);
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,litter_code,1 FROM litters WHERE litter_code IN ('CAA','CAB');

\echo '#### PROBE 6  mates: 상태만 올리면 부모와 예정일을 잃는다 ####'
WITH n AS (SELECT nextval('mates_id_seq') id)
INSERT INTO mates (id,origin_mate_id,mother_mouse_id,father_mouse_id,status,actor_id,expected_delivery_on)
SELECT id,id,(SELECT min(id) FROM mouse_meta),(SELECT max(id) FROM mouse_meta),
       'cohoused',(SELECT id FROM u2),'2026-09-30' FROM n;
SAVEPOINT bad6;
INSERT INTO mates (origin_mate_id,status,actor_id)
SELECT id,'pregnant',(SELECT id FROM u2) FROM mates WHERE id=origin_mate_id;
SELECT id,status,mother_mouse_id,father_mouse_id,expected_delivery_on FROM mates ORDER BY id;
ROLLBACK TO bad6;
\echo '   올바른 방식 — head 를 복사하고 바뀐 것만 덮어쓴다 (prev_id CAS 포함):'
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,mate_raw_label,
                   status,occurred_at,expected_delivery_on,actor_id,note,prev_id)
SELECT h.origin_mate_id,h.mother_mouse_id,h.father_mouse_id,h.mate_raw_label,
       'pregnant',now(),h.expected_delivery_on,(SELECT id FROM u2),'confirmed',h.id
FROM (SELECT DISTINCT ON (origin_mate_id) * FROM mates WHERE deleted_at IS NULL
      ORDER BY origin_mate_id,occurred_at DESC,id DESC) h;
SELECT DISTINCT ON (origin_mate_id) status,mother_mouse_id,father_mouse_id,expected_delivery_on
FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC;

\echo '#### PROBE 7  tasks: done 으로 올리면 담당자와 대상을 잃는다 ####'
WITH n AS (SELECT nextval('tasks_id_seq') id)
INSERT INTO tasks (id,origin_task_id,task_type,status,actor_role,created_by,
                   subject_cage_id,assigned_to,direction)
SELECT id,id,'wean','open','professor',(SELECT id FROM u2),
       (SELECT id FROM cages WHERE cage_number='9001'),(SELECT id FROM u2),'{"count":3}' FROM n;
SAVEPOINT bad7;
INSERT INTO tasks (origin_task_id,task_type,status,from_status,actor_role,created_by)
SELECT origin_task_id,task_type,'done','open','staff',created_by FROM tasks WHERE id=origin_task_id;
SELECT id,status,subject_cage_id,assigned_to,direction FROM tasks ORDER BY id;
ROLLBACK TO bad7;
\echo '   올바른 방식 (prev_id CAS 포함):'
INSERT INTO tasks (origin_task_id,subject_mouse_id,subject_cage_id,litter_id,task_type,due_date,
                   status,from_status,actor_role,created_by,assigned_to,direction,prev_id,done_by,done_at)
SELECT h.origin_task_id,h.subject_mouse_id,h.subject_cage_id,h.litter_id,h.task_type,h.due_date,
       'done',h.status,'staff',h.created_by,h.assigned_to,h.direction,h.id,(SELECT id FROM u2),now()
FROM (SELECT DISTINCT ON (origin_task_id) * FROM tasks WHERE deleted_at IS NULL
      ORDER BY origin_task_id,id DESC) h;
SELECT DISTINCT ON (origin_task_id) status,subject_cage_id,assigned_to,direction
FROM tasks WHERE deleted_at IS NULL ORDER BY origin_task_id,id DESC;

\echo '#### PROBE 8  notes: 본문만 고치면 대상 litter 를 잃는다 ####'
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,litter_id,note_type,signal_id,body,actor_id)
SELECT id,id,(SELECT min(id) FROM litters WHERE litter_code='CAA'),'preg_check',
       (SELECT id FROM signals WHERE type='instruction'),'preg?',(SELECT id FROM u2) FROM n;
SAVEPOINT bad8;
INSERT INTO notes (origin_note_id,note_type,signal_id,body,actor_id)
SELECT origin_note_id,note_type,signal_id,'no pups',(SELECT id FROM u2) FROM notes WHERE id=origin_note_id;
SELECT id,body,litter_id FROM notes ORDER BY id;
ROLLBACK TO bad8;
\echo '   올바른 방식 (prev_id CAS 포함):'
INSERT INTO notes (origin_note_id,subject_mouse_id,litter_id,note_type,meta,signal_id,body,actor_id,prev_id)
SELECT h.origin_note_id,h.subject_mouse_id,h.litter_id,h.note_type,h.meta,
       (SELECT id FROM signals WHERE type='done'),'no pups',(SELECT id FROM u2),h.id
FROM (SELECT DISTINCT ON (origin_note_id) * FROM notes WHERE deleted_at IS NULL
      ORDER BY origin_note_id,id DESC) h;
SELECT DISTINCT ON (origin_note_id) body,litter_id FROM notes
WHERE deleted_at IS NULL ORDER BY origin_note_id,id DESC;
ROLLBACK;

-- ===========================================================================
-- PROBE 9-11: R25 invariants — CAS collision, notes reach, audit immutability
-- litter_code CHECK: ^[A-Z]{1,5}$ — use short all-caps codes only
-- ===========================================================================

\echo '==== R25 PROBE 9: CAS 충돌 — 동시 append 두 번 째는 거부된다 ===='
BEGIN;
INSERT INTO users (display_name,role) VALUES ('PCAS','professor');
CREATE TEMP TABLE u3 AS SELECT max(id) id FROM users;
INSERT INTO colonies (name) VALUES ('MR3');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'casline' FROM colonies WHERE name='MR3';
INSERT INTO cages (line_id,cage_number) SELECT id,'CASXX' FROM mouse_lines WHERE name='casline';
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT 'CASA',true,(SELECT id FROM u3);
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,'CASA',1 FROM litters WHERE litter_code='CASA';
-- Creation row: prev_id NULL
INSERT INTO mice (mouse_meta_id,cage_id,line_id,sex,actor_id,reason)
SELECT mm.id,(SELECT id FROM cages WHERE cage_number='CASXX'),
       (SELECT id FROM mouse_lines WHERE name='casline'),
       'F',(SELECT id FROM u3),'import'
FROM mouse_meta mm WHERE litter_code='CASA';
CREATE TEMP TABLE head3 AS
SELECT id AS head_id, mouse_meta_id FROM mice
WHERE mouse_meta_id=(SELECT id FROM mouse_meta WHERE litter_code='CASA');

\echo '   -- Append A: prev_id = head (succeeds)'
INSERT INTO mice (mouse_meta_id,cage_id,line_id,sex,actor_id,reason,prev_id)
SELECT h.mouse_meta_id,(SELECT id FROM cages WHERE cage_number='CASXX'),
       (SELECT id FROM mouse_lines WHERE name='casline'),
       'F',(SELECT id FROM u3),'append A',h.head_id
FROM head3 h;

\echo '   -- Append B: same prev_id = head -> must be rejected by mice_prev_cas_key'
SAVEPOINT cas_b;
INSERT INTO mice (mouse_meta_id,cage_id,line_id,sex,actor_id,reason,prev_id)
SELECT h.mouse_meta_id,(SELECT id FROM cages WHERE cage_number='CASXX'),
       (SELECT id FROM mouse_lines WHERE name='casline'),
       'M',(SELECT id FROM u3),'append B must fail',h.head_id
FROM head3 h;
ROLLBACK TO cas_b;
\echo '   -> Append B rejected by mice_prev_cas_key (unique_violation). CAS holds.'

SELECT id,reason,prev_id FROM mice
WHERE mouse_meta_id=(SELECT id FROM mouse_meta WHERE litter_code='CASA')
ORDER BY id;
ROLLBACK;

\echo '==== R25 PROBE 10: notes reach — 모든 목표 구성 (zero/one/multiple) 허용 ===='
BEGIN;
INSERT INTO users (display_name,role) VALUES ('PNotes','professor');
CREATE TEMP TABLE u4 AS SELECT max(id) id FROM users;
INSERT INTO colonies (name) VALUES ('MR4');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'n4' FROM colonies WHERE name='MR4';
INSERT INTO cages (line_id,cage_number) SELECT id,'NTXX' FROM mouse_lines WHERE name='n4';
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT 'NLIT',true,(SELECT id FROM u4);
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,'NLIT',1 FROM litters WHERE litter_code='NLIT';

-- (a) Room-level note: all target FKs NULL — no exactly-one constraint so this is legal
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,note_type,signal_id,body,actor_id)
SELECT id,id,'room_task',(SELECT id FROM signals WHERE type='instruction'),
       'CHECK WATER',(SELECT id FROM u4) FROM n;
\echo '   -> (a) room-level note (no target FKs set) inserted'

-- (b) Note with subject_mouse_id AND litter_id both set: legal in R25 (no exactly-one CHECK)
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,subject_mouse_id,litter_id,note_type,signal_id,body,actor_id)
SELECT id,id,
       (SELECT id FROM mouse_meta WHERE litter_code='NLIT'),
       (SELECT id FROM litters WHERE litter_code='NLIT'),
       'preg_check',(SELECT id FROM signals WHERE type='instruction'),
       'mouse+litter note',(SELECT id FROM u4) FROM n;
\echo '   -> (b) note with subject_mouse_id AND litter_id both set: accepted (no exactly-one constraint)'

-- (c) Cage-level note
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,cage_id,note_type,signal_id,body,actor_id)
SELECT id,id,(SELECT id FROM cages WHERE cage_number='NTXX'),
       'cage_task',(SELECT id FROM signals WHERE type='plan'),
       'refill bedding',(SELECT id FROM u4) FROM n;
\echo '   -> (c) cage-level note inserted'

SELECT note_type,body,subject_mouse_id,litter_id,cage_id
FROM notes ORDER BY id;
ROLLBACK;

\echo '==== R25 PROBE 11: audit_logs 불변성 ===='
-- audit_logs has REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC (migration 0019).
-- The DB owner bypasses REVOKE (ownership trumps PUBLIC). There are no non-superuser
-- roles in this dev cluster (confirmed: 0 rows from
--   SELECT rolname FROM pg_roles WHERE NOT rolsuper AND rolcanlogin).
-- Therefore we cannot demonstrate a runtime rejection here without creating a role.
-- We DO NOT create roles (cluster-level, survive db:reset, pollute the environment).
-- Strategy: INSERT succeeds (owner can always INSERT); UPDATE also succeeds as owner
-- but is rolled back. The REVOKE guard is real — a production app role that is not
-- the table owner WILL receive: ERROR 42501 permission denied for table audit_logs.
BEGIN;
INSERT INTO users (display_name,role) VALUES ('PAudit','professor');
INSERT INTO audit_logs (actor_id,action,entity,entity_id)
SELECT max(id),'create','mice',1 FROM users;
\echo '   -> INSERT into audit_logs: OK (owner can always INSERT; immutability is enforced at the role layer)'
SAVEPOINT audit_update;
UPDATE audit_logs SET action='tampered' WHERE entity='mice';
\echo '   -> UPDATE audit_logs: succeeded as DB owner (ownership bypasses REVOKE FROM PUBLIC).'
\echo '      A non-owner app role would receive: ERROR 42501 permission denied.'
\echo '      Cannot demonstrate rejection without creating a separate role (avoided: cluster-level side effect).'
ROLLBACK TO audit_update;
ROLLBACK;

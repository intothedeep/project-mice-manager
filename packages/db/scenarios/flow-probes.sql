-- Focused probes on the risks the append-style design creates.
-- Ends in ROLLBACK.
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name,role) VALUES ('P','professor');
CREATE TEMP TABLE u AS SELECT max(id) id FROM users;
INSERT INTO colonies (name) VALUES ('MR');
INSERT INTO subcolonies (colony_id,name) SELECT id,'n' FROM colonies;
INSERT INTO cages (subcolony_id,cage_number) SELECT id,'2475' FROM subcolonies;
INSERT INTO litters (litter_code,is_from_outside,created_by) SELECT 'BJA',true,(SELECT id FROM u);
INSERT INTO mouse_meta (litter_id,litter_code,pup_number) SELECT id,'BJA',1 FROM litters;
INSERT INTO mice (mouse_meta_id,cage_id,sex,actor_id,reason)
SELECT id,(SELECT id FROM cages),'F',(SELECT id FROM u),'import' FROM mouse_meta;

\echo '#### PROBE 1  부분 행 삽입은 상태를 잃는다 (append 설계의 핵심 위험) ####'
SAVEPOINT partial;
INSERT INTO mice (mouse_meta_id,actor_id,is_alive,death_reason,reason)
SELECT id,(SELECT id FROM u),false,'sac','sacrificed' FROM mouse_meta;
SELECT id,cage_id,sex,is_alive,reason FROM mice ORDER BY id;
\echo '   -> 최신 행의 cage 와 sex 가 NULL. 쥐가 케이지에서 사라집니다.'
\echo '   -> 스키마로는 막을 수 없습니다: NULL 은 "미배치" 라는 정당한 값이기도 합니다 (P5).'
\echo '   -> 서비스가 이전 head 를 읽어 통째로 이어써야 합니다.'
ROLLBACK TO partial;

\echo '#### PROBE 2  올바른 방식: 이전 head 를 이어받아 새 행 ####'
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,is_alive,death_reason,attention,transit_status,actor_id,reason)
SELECT prev.mouse_meta_id,prev.cage_id,prev.slot_id,prev.sex,false,'sac',prev.attention,prev.transit_status,
       (SELECT id FROM u),'sacrificed'
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL
      ORDER BY mouse_meta_id,id DESC) prev;
SELECT DISTINCT ON (mouse_meta_id) id,cage_id,sex,is_alive,death_reason FROM mice
WHERE deleted_at IS NULL ORDER BY mouse_meta_id,id DESC;

\echo '#### PROBE 3  created_at 은 트랜잭션 시작 시각 — 시간여행은 effective_at 로 ####'
INSERT INTO mice (mouse_meta_id,cage_id,sex,actor_id,reason,effective_at)
SELECT id,(SELECT id FROM cages),'F',(SELECT id FROM u),'later','2026-12-01' FROM mouse_meta;
SELECT count(DISTINCT created_at) AS "서로 다른 created_at",
       count(DISTINCT effective_at) AS "서로 다른 effective_at" FROM mice;

\echo '#### PROBE 4  재시도 방지: 같은 idempotency_key 두 번 -> 거부 ####'
INSERT INTO mice (mouse_meta_id,actor_id,idempotency_key)
SELECT id,(SELECT id FROM u),'11111111-1111-1111-1111-111111111111' FROM mouse_meta;
SAVEPOINT idem;
INSERT INTO mice (mouse_meta_id,actor_id,idempotency_key)
SELECT id,(SELECT id FROM u),'11111111-1111-1111-1111-111111111111' FROM mouse_meta;
ROLLBACK TO idem;

\echo '#### PROBE 5  litter 없는 쥐는 만들 수 없다 (P4 재발 방지) ####'
SAVEPOINT nolitter;
INSERT INTO mouse_meta (pup_number) VALUES (1);
ROLLBACK TO nolitter;
ROLLBACK;

-- Pairing workflow (R22): pending -> cohoused -> awaiting -> pregnant -> delivered.
-- Every transition is written to audit_logs; co-housing is VERIFIED by query.
-- Ends in ROLLBACK.
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name,role) VALUES ('Dr.Lopez','professor'),('staff1','staff');
CREATE TEMP TABLE w AS SELECT (SELECT id FROM users WHERE role='professor') prof,
                              (SELECT id FROM users WHERE role='staff') staff;
INSERT INTO colonies (name) VALUES ('MR');
INSERT INTO subcolonies (colony_id,name) SELECT id,'nNf1 flox;ccEGFP' FROM colonies;
INSERT INTO cages (subcolony_id,cage_number) SELECT id,v FROM subcolonies,(VALUES ('2475'),('2477')) t(v);
INSERT INTO slots (cage_id,label) SELECT id,'A8' FROM cages;
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT v,true,(SELECT prof FROM w) FROM (VALUES ('BJA'),('BJB')) t(v);
INSERT INTO mouse_meta (litter_id,litter_code,subcolony_id,pup_number)
SELECT id,litter_code,(SELECT id FROM subcolonies),1 FROM litters;
CREATE TEMP TABLE p AS SELECT
  (SELECT min(id) FROM mouse_meta) mom, (SELECT max(id) FROM mouse_meta) dad,
  (SELECT min(id) FROM cages) c_mom, (SELECT max(id) FROM cages) c_dad,
  (SELECT min(id) FROM slots) s_mom, (SELECT max(id) FROM slots) s_dad;
-- 부모는 서로 다른 케이지에서 시작
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,effective_at)
SELECT mom,c_mom,s_mom,'F',(SELECT prof FROM w),'import','2026-08-01' FROM p;
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,effective_at)
SELECT dad,c_dad,s_dad,'M',(SELECT prof FROM w),'import','2026-08-01' FROM p;

\echo '=== 1. 교수가 교배 지시 -> pending (합사전) ==='
INSERT INTO mates (mother_mouse_id,father_mouse_id,created_by)
SELECT mom,dad,(SELECT prof FROM w) FROM p;
INSERT INTO audit_logs (actor_id,action,entity,entity_id,after_json)
SELECT (SELECT prof FROM w),'create','mates',(SELECT max(id) FROM mates),'{"status":"pending"}';
SELECT id,status FROM mates;

\echo '=== 2. 합사: 아빠를 엄마 케이지로 이동 -> cohoused ==='
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,transit_status,effective_at)
SELECT dad,c_mom,s_mom,'M',(SELECT staff FROM w),'cohouse for mating','verified','2026-08-10' FROM p;
UPDATE mates SET cohoused_at='2026-08-10';
INSERT INTO audit_logs (actor_id,action,entity,entity_id,before_json,after_json)
SELECT (SELECT staff FROM w),'update','mates',(SELECT max(id) FROM mates),
       '{"status":"pending"}','{"status":"cohoused"}';

\echo '   -- 동거 검증: 두 부모가 같은 subcolony/cage/slot 인가'
SELECT count(DISTINCT cur.cage_id) AS cages, count(DISTINCT cur.slot_id) AS slots,
       count(DISTINCT mm.subcolony_id) AS subcolonies,
       CASE WHEN count(DISTINCT cur.cage_id)=1 AND count(DISTINCT cur.slot_id)=1
            THEN 'OK 합사됨' ELSE 'MISMATCH' END AS verdict
FROM mates m
JOIN mouse_meta mm ON mm.id IN (m.mother_mouse_id, m.father_mouse_id)
JOIN LATERAL (SELECT DISTINCT ON (mouse_meta_id) cage_id,slot_id FROM mice
              WHERE mouse_meta_id=mm.id ORDER BY mouse_meta_id,effective_at DESC) cur ON true;

\echo '=== 3. awaiting -> 4. pregnant -> 5. delivered ==='
UPDATE mates SET awaiting_at='2026-08-11';
INSERT INTO audit_logs (actor_id,action,entity,entity_id,before_json,after_json)
SELECT (SELECT staff FROM w),'update','mates',(SELECT max(id) FROM mates),'{"status":"cohoused"}','{"status":"awaiting"}';
UPDATE mates SET pregnant_at='2026-08-17';
INSERT INTO audit_logs (actor_id,action,entity,entity_id,before_json,after_json)
SELECT (SELECT prof FROM w),'update','mates',(SELECT max(id) FROM mates),'{"status":"awaiting"}','{"status":"pregnant"}';
INSERT INTO litters (mate_id,litter_code,mated_on,birth_date,pup_count,created_by)
SELECT (SELECT max(id) FROM mates),'BCW','2026-08-10','2026-08-31',5,(SELECT prof FROM w);
UPDATE mates SET delivered_at='2026-08-31';
INSERT INTO audit_logs (actor_id,action,entity,entity_id,before_json,after_json)
SELECT (SELECT prof FROM w),'update','mates',(SELECT max(id) FROM mates),'{"status":"pregnant"}','{"status":"delivered"}';

\echo '   -- 출산 시점에도 부모는 같은 케이지/슬롯인가'
SELECT CASE WHEN count(DISTINCT cur.cage_id)=1 AND count(DISTINCT cur.slot_id)=1
            THEN 'OK 여전히 합사 상태' ELSE 'MISMATCH' END AS verdict
FROM mates m
JOIN mouse_meta mm ON mm.id IN (m.mother_mouse_id, m.father_mouse_id)
JOIN LATERAL (SELECT DISTINCT ON (mouse_meta_id) cage_id,slot_id FROM mice
              WHERE mouse_meta_id=mm.id ORDER BY mouse_meta_id,effective_at DESC) cur ON true;

\echo '=== 6. 전체 이력이 로그에 남았는가 ==='
SELECT a.action, a.before_json->>'status' AS "from", a.after_json->>'status' AS "to",
       u.display_name AS actor
FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.id;

\echo '=== 7. 각 단계 시각 + 유도된 status ==='
SELECT cohoused_at::date, awaiting_at::date, pregnant_at::date, delivered_at::date, status FROM mates;

\echo '=== 8. status 를 직접 쓰려 하면 -> 거부 (생성 컬럼) ==='
SAVEPOINT s; UPDATE mates SET status='married'; ROLLBACK TO s;

\echo '=== 9. 되돌리기: delivered_at 을 지우면 status 가 따라 내려감 ==='
UPDATE mates SET delivered_at=NULL;
SELECT status AS "delivered_at 제거 후" FROM mates;
ROLLBACK;

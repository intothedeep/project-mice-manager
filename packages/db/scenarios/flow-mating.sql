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
CREATE TEMP TABLE mt AS SELECT max(id) id FROM mates;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'pending','2026-08-09',(SELECT prof FROM w),'ordered' FROM mt;
SELECT DISTINCT ON (mate_id) mate_id,status FROM mate_status_logs
WHERE deleted_at IS NULL ORDER BY mate_id,occurred_at DESC,id DESC;

\echo '=== 2. 합사: 아빠를 엄마 케이지로 이동 -> cohoused ==='
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,transit_status,effective_at)
SELECT dad,c_mom,s_mom,'M',(SELECT staff FROM w),'cohouse for mating','verified','2026-08-10' FROM p;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'cohoused','2026-08-10',(SELECT staff FROM w),'father moved in' FROM mt;

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
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'awaiting','2026-08-11',(SELECT staff FROM w),'no plug seen' FROM mt;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,is_occurred_at_approx,actor_id,note)
SELECT id,'pregnant','2026-08-17',true,(SELECT prof FROM w),'~ estimated, no plug' FROM mt;
\echo '   -- 되돌리기: 임신 아님으로 판명 -> awaiting 으로 복귀 (이력 보존)'
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'awaiting','2026-08-20',(SELECT prof FROM w),'not pregnant after all' FROM mt;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'pregnant','2026-08-24',(SELECT prof FROM w),'confirmed on recheck' FROM mt;
INSERT INTO litters (mate_id,litter_code,pup_count,created_by)
SELECT (SELECT id FROM mt),'BCW',5,(SELECT prof FROM w);
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id,note)
SELECT id,'delivered','2026-08-31',(SELECT prof FROM w),'5 pups' FROM mt;

\echo '   -- 출산 시점에도 부모는 같은 케이지/슬롯인가'
SELECT CASE WHEN count(DISTINCT cur.cage_id)=1 AND count(DISTINCT cur.slot_id)=1
            THEN 'OK 여전히 합사 상태' ELSE 'MISMATCH' END AS verdict
FROM mates m
JOIN mouse_meta mm ON mm.id IN (m.mother_mouse_id, m.father_mouse_id)
JOIN LATERAL (SELECT DISTINCT ON (mouse_meta_id) cage_id,slot_id FROM mice
              WHERE mouse_meta_id=mm.id ORDER BY mouse_meta_id,effective_at DESC) cur ON true;

\echo '=== 6. 전체 상태 이력 (되돌림 포함) ==='
SELECT l.occurred_at::date AS "when", l.status, l.is_occurred_at_approx AS "approx",
       u.display_name AS actor, l.note
FROM mate_status_logs l JOIN users u ON u.id=l.actor_id ORDER BY l.id;

\echo '=== 7. 현재 상태 = 최신 행 ==='
SELECT DISTINCT ON (mate_id) status, occurred_at::date, note FROM mate_status_logs
WHERE deleted_at IS NULL ORDER BY mate_id, occurred_at DESC, id DESC;

\echo '=== 8. 잘못된 상태값 -> 거부 ==='
SAVEPOINT s;
INSERT INTO mate_status_logs (mate_id,status,actor_id) SELECT id,'married',(SELECT prof FROM w) FROM mt;
ROLLBACK TO s;

\echo '=== 9. 같은 커플이 재교배 -> 새 mates + 새 litter ==='
INSERT INTO mates (mother_mouse_id,father_mouse_id,created_by)
SELECT mom,dad,(SELECT prof FROM w) FROM p;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id)
SELECT max(id),'cohoused','2026-10-01',(SELECT prof FROM w) FROM mates;
INSERT INTO litters (mate_id,litter_code,pup_count,created_by)
SELECT max(id),'BGX',4,(SELECT prof FROM w) FROM mates;
INSERT INTO mate_status_logs (mate_id,status,occurred_at,actor_id)
SELECT max(id),'delivered','2026-10-22',(SELECT prof FROM w) FROM mates;
\echo '   출생일은 litters 가 아니라 delivered 로그에서 읽는다:'
SELECT m.id AS mate, l.litter_code, l.pup_count,
       (SELECT occurred_at::date FROM mate_status_logs s
        WHERE s.mate_id=m.id AND s.status='delivered' AND s.deleted_at IS NULL
        ORDER BY occurred_at DESC, id DESC LIMIT 1) AS birth_date,
       (SELECT status FROM mate_status_logs s WHERE s.mate_id=m.id
        ORDER BY occurred_at DESC, id DESC LIMIT 1) AS status
FROM mates m LEFT JOIN litters l ON l.mate_id=m.id ORDER BY m.id;
ROLLBACK;

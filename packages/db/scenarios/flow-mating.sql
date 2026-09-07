-- Pairing workflow (R25): pending -> cohoused -> awaiting -> pregnant -> delivered.
-- Co-housing is VERIFIED by query. Ends in ROLLBACK.
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name,role) VALUES ('Dr.Lopez','professor'),('staff1','staff');
CREATE TEMP TABLE w AS SELECT (SELECT id FROM users WHERE role='professor') prof,
                              (SELECT id FROM users WHERE role='staff') staff;
INSERT INTO colonies (name) VALUES ('MR');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'nNf1 flox;ccEGFP' FROM colonies;
INSERT INTO cages (line_id,cage_number) SELECT id,v FROM mouse_lines,(VALUES ('2475'),('2477')) t(v);
-- slots.label is globally unique; qualify with cage_number
INSERT INTO slots (cage_id,label)
SELECT c.id, c.cage_number||'-A8' FROM cages c;
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT v,true,(SELECT prof FROM w) FROM (VALUES ('BJA'),('BJB')) t(v);
-- R25: mouse_meta no longer has line_id; line_id lives on mice version rows
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,litter_code,1 FROM litters;
CREATE TEMP TABLE p AS SELECT
  (SELECT min(id) FROM mouse_meta) mom, (SELECT max(id) FROM mouse_meta) dad,
  (SELECT min(id) FROM cages) c_mom, (SELECT max(id) FROM cages) c_dad,
  (SELECT id FROM slots WHERE label='2475-A8') s_mom,
  (SELECT id FROM slots WHERE label='2477-A8') s_dad;
-- 부모는 서로 다른 케이지에서 시작; R25: line_id on mice rows, prev_id NULL for creation
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,effective_at)
SELECT mom,c_mom,s_mom,'F',(SELECT id FROM mouse_lines),(SELECT prof FROM w),'import','2026-08-01' FROM p;
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,effective_at)
SELECT dad,c_dad,s_dad,'M',(SELECT id FROM mouse_lines),(SELECT prof FROM w),'import','2026-08-01' FROM p;

\echo '=== 1. 교수가 교배 지시 -> pending (합사전) ==='
WITH n AS (SELECT nextval('mates_id_seq') id)
INSERT INTO mates (id,origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,actor_id,note)
SELECT id,id,(SELECT mom FROM p),(SELECT dad FROM p),'pending','2026-08-09',(SELECT prof FROM w),'ordered' FROM n;
CREATE TEMP TABLE mt AS SELECT max(id) id FROM mates;
SELECT id,origin_mate_id,(id=origin_mate_id) AS self_ref,status FROM mates;

\echo '=== 2. 합사: 아빠를 엄마 케이지로 이동 -> cohoused ==='
-- R25: append must carry line_id forward and set prev_id = head id
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,transit_status,effective_at,prev_id)
SELECT prev.mouse_meta_id,p.c_mom,p.s_mom,'M',prev.line_id,
       (SELECT staff FROM w),'cohouse for mating','verified','2026-08-10',prev.id
FROM p, (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL
         ORDER BY mouse_meta_id,id DESC) prev
WHERE prev.mouse_meta_id=p.dad;
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'cohoused','2026-08-10',false,(SELECT staff FROM w),'father moved in',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);

\echo '   -- 동거 검증: 두 부모가 같은 mouse line/cage/slot 인가'
SELECT count(DISTINCT cur.cage_id) AS cages, count(DISTINCT cur.slot_id) AS slots,
       count(DISTINCT cur.line_id) AS mouse_lines,
       CASE WHEN count(DISTINCT cur.cage_id)=1 AND count(DISTINCT cur.slot_id)=1
            THEN 'OK 합사됨' ELSE 'MISMATCH' END AS verdict
FROM mates m
JOIN mouse_meta mm ON mm.id IN (m.mother_mouse_id, m.father_mouse_id)
JOIN LATERAL (SELECT DISTINCT ON (mouse_meta_id) cage_id,slot_id,line_id FROM mice
              WHERE mouse_meta_id=mm.id ORDER BY mouse_meta_id,effective_at DESC) cur ON true
WHERE m.id=(SELECT max(id) FROM mates);

\echo '=== 3. awaiting -> 4. pregnant -> 5. delivered ==='
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'awaiting','2026-08-11',false,(SELECT staff FROM w),'preg?',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'pregnant','2026-08-17',true,(SELECT prof FROM w),'~ estimated, no plug',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);
\echo '   -- 되돌리기: 임신 아님으로 판명 -> awaiting 으로 복귀 (이력 보존)'
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'awaiting','2026-08-20',false,(SELECT prof FROM w),'not pregnant after all',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'pregnant','2026-08-24',false,(SELECT prof FROM w),'confirmed on recheck',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);
INSERT INTO litters (mate_id,litter_code,pup_count,created_by)
SELECT (SELECT id FROM mt),'BCW',5,(SELECT prof FROM w);
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,is_occurred_at_approx,actor_id,note,prev_id)
SELECT (SELECT id FROM mt),(SELECT mom FROM p),(SELECT dad FROM p),'delivered','2026-08-31',false,(SELECT prof FROM w),'5 pups',
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates WHERE deleted_at IS NULL ORDER BY origin_mate_id,occurred_at DESC,id DESC);

\echo '   -- 출산 시점에도 부모는 같은 케이지/슬롯인가'
SELECT CASE WHEN count(DISTINCT cur.cage_id)=1 AND count(DISTINCT cur.slot_id)=1
            THEN 'OK 여전히 합사 상태' ELSE 'MISMATCH' END AS verdict
FROM mates m
JOIN mouse_meta mm ON mm.id IN (m.mother_mouse_id, m.father_mouse_id)
JOIN LATERAL (SELECT DISTINCT ON (mouse_meta_id) cage_id,slot_id FROM mice
              WHERE mouse_meta_id=mm.id ORDER BY mouse_meta_id,effective_at DESC) cur ON true
WHERE m.id=(SELECT max(id) FROM mates);

\echo '=== 6. 전체 상태 이력 (되돌림 포함) ==='
SELECT m.occurred_at::date AS "when", m.status, m.is_occurred_at_approx AS "approx",
       u.display_name AS actor, m.note
FROM mates m JOIN users u ON u.id=m.actor_id ORDER BY m.occurred_at, m.id;

\echo '=== 7. 현재 상태 = 최신 행 ==='
SELECT DISTINCT ON (origin_mate_id) status, occurred_at::date, note FROM mates
WHERE deleted_at IS NULL ORDER BY origin_mate_id, occurred_at DESC, id DESC;

\echo '=== 8. 잘못된 상태값 -> 거부 ==='
SAVEPOINT s;
INSERT INTO mates (origin_mate_id,status,actor_id) SELECT id,'married',(SELECT prof FROM w) FROM mt;
ROLLBACK TO s;

\echo '=== 9. 같은 커플이 재교배 -> 새 mates + 새 litter ==='
WITH n AS (SELECT nextval('mates_id_seq') id)
INSERT INTO mates (id,origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,actor_id)
SELECT id,id,(SELECT mom FROM p),(SELECT dad FROM p),'cohoused','2026-10-01',(SELECT prof FROM w) FROM n;
INSERT INTO litters (mate_id,litter_code,pup_count,created_by)
SELECT max(id),'BGX',4,(SELECT prof FROM w) FROM mates;
INSERT INTO mates (origin_mate_id,mother_mouse_id,father_mouse_id,status,occurred_at,actor_id,prev_id)
SELECT max(origin_mate_id),(SELECT mom FROM p),(SELECT dad FROM p),'delivered','2026-10-22',
       (SELECT prof FROM w),
       (SELECT DISTINCT ON (origin_mate_id) id FROM mates
        WHERE origin_mate_id=(SELECT max(origin_mate_id) FROM mates) AND deleted_at IS NULL
        ORDER BY origin_mate_id,occurred_at DESC,id DESC)
FROM mates;
\echo '   출생일은 litters 가 아니라 delivered 로그에서 읽는다:'
SELECT m.id AS mate, l.litter_code, l.pup_count,
       (SELECT occurred_at::date FROM mates s
        WHERE s.origin_mate_id=m.id AND s.status='delivered' AND s.deleted_at IS NULL
        ORDER BY occurred_at DESC, id DESC LIMIT 1) AS birth_date,
       (SELECT status FROM mates s WHERE s.origin_mate_id=m.id
        ORDER BY occurred_at DESC, id DESC LIMIT 1) AS status
FROM mates m LEFT JOIN litters l ON l.mate_id=m.id
WHERE m.id=m.origin_mate_id ORDER BY m.id;
ROLLBACK;

\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name, role) VALUES ('etl','admin');
CREATE TEMP TABLE w AS SELECT (SELECT max(id) FROM users) etl;
INSERT INTO colonies (name) VALUES ('MR');
INSERT INTO subcolonies (colony_id,name) SELECT id,'B' FROM colonies;
INSERT INTO cages (subcolony_id,cage_number) SELECT id,v FROM subcolonies,(VALUES ('2475'),('2482')) t(v);

\echo '#### P-C 재import: litter 없는 쥐(외부/부모)를 두 번 넣으면? ####'
INSERT INTO mouse_meta (sex,dob,raw_mouse_id) VALUES ('F','2025-11-24','F1BAL');
INSERT INTO mouse_meta (sex,dob,raw_mouse_id) VALUES ('F','2025-11-24','F1BAL');
SELECT count(*) AS "F1BAL 행 수", 'litter_id NULL 이라 자연키가 안 걸림' AS note
FROM mouse_meta WHERE raw_mouse_id='F1BAL';

\echo '#### P-E 새끼는 mouse_meta 만 있고 mice(상태행) 가 없으면? ####'
INSERT INTO mates (mother_mouse_id,created_by) SELECT min(id),(SELECT etl FROM w) FROM mouse_meta;
INSERT INTO litters (mate_id,litter_code,birth_date,pup_count,created_by)
SELECT max(id),'BIZ','2026-08-31',2,(SELECT etl FROM w) FROM mates;
INSERT INTO mouse_meta (litter_id,litter_code,pup_number,sex,dob)
SELECT (SELECT id FROM litters),(SELECT litter_code FROM litters),n,'U','2026-08-31' FROM generate_series(1,2) n;
SELECT (SELECT count(*) FROM mouse_meta) AS "쥐 총수",
       (SELECT count(*) FROM mice) AS "상태행 있는 쥐",
       (SELECT count(*) FROM mouse_meta mm WHERE NOT EXISTS
          (SELECT 1 FROM mice m WHERE m.mouse_meta_id=mm.id)) AS "위치 불명 (모든 뷰에서 사라짐)";

\echo '#### P-A 이동은 기록했는데 mice 캐시를 안 쌓으면? ####'
INSERT INTO mice (mouse_meta_id,cage_id,status,actor_id)
SELECT id,(SELECT min(id) FROM cages),'alive',(SELECT etl FROM w) FROM mouse_meta WHERE pup_number=1;
INSERT INTO mouse_moves (mouse_id,from_cage_id,to_cage_id,actor_id,reason,idempotency_key)
SELECT id,(SELECT min(id) FROM cages),(SELECT max(id) FROM cages),(SELECT etl FROM w),'wean',gen_random_uuid()
FROM mouse_meta WHERE pup_number=1;
SELECT c1.cage_number AS "mice 캐시가 말하는 위치", c2.cage_number AS "mouse_moves 가 말하는 위치"
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice ORDER BY mouse_meta_id,id DESC) cur
JOIN cages c1 ON c1.id=cur.cage_id
JOIN mouse_moves mv ON mv.mouse_id=cur.mouse_meta_id
JOIN cages c2 ON c2.id=mv.to_cage_id;

\echo '#### P-F 부모 미상 litter 를 넣을 수 있는가 (과거 데이터) ####'
SAVEPOINT s;
INSERT INTO litters (litter_code,birth_date,created_by) VALUES ('BJA','2025-01-01',(SELECT etl FROM w));
SELECT 'mate_id NULL litter 삽입 OK' AS r;
ROLLBACK TO s;

\echo '#### P-G 성별 정정 이력이 남는가 ####'
UPDATE mouse_meta SET sex='M' WHERE pup_number=1;
SELECT 'mouse_meta.sex 는 덮어쓰기 — 이전 값 U 는 어디에도 없음' AS r;
ROLLBACK;

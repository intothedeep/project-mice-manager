\set ON_ERROR_STOP off
BEGIN;
-- ── 사전: 사용자/공간 ──────────────────────────────────────────
INSERT INTO users (display_name, role) VALUES ('Dr.Lopez','professor'),('staff1','staff'),('etl','admin');
CREATE TEMP TABLE w AS SELECT
  (SELECT id FROM users WHERE role='professor') prof,
  (SELECT id FROM users WHERE role='staff') staff,
  (SELECT id FROM users WHERE role='admin') etl;
INSERT INTO colonies (name) VALUES ('MouseRoom');
INSERT INTO subcolonies (colony_id, name) SELECT id,'Breeders' FROM colonies;
INSERT INTO cages (subcolony_id, cage_number) SELECT id,v FROM subcolonies,(VALUES ('2475'),('2477'),('2482')) t(v);
INSERT INTO slots (cage_id,label) SELECT id,'A8' FROM cages;

\echo '#### S1 부모 2마리 import (genotype 포함) ####'
INSERT INTO mouse_meta (sex,dob,raw_mouse_id,raw_genotype) VALUES
 ('F','2025-11-24','F1BAL','Nf1 f/+;ccEGFP'),('M','2025-11-24','M5BAL','NG2Cre(hmo);Nf1 +/+');
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,status,actor_id,change_note)
SELECT mm.id,(SELECT min(id) FROM cages),(SELECT min(id) FROM slots),'alive',(SELECT etl FROM w),'import'
FROM mouse_meta mm;
INSERT INTO mouse_genotypes (mouse_id,order_index,marker_text)
SELECT id,1,'Nf1 f/+' FROM mouse_meta WHERE sex='F';
\echo '   -> ok'

\echo '#### S2 교수: 교배 지시 (mate 생성 + task) ####'
INSERT INTO mates (mother_mouse_id,father_mouse_id,created_by)
SELECT (SELECT id FROM mouse_meta WHERE sex='F'),(SELECT id FROM mouse_meta WHERE sex='M'),(SELECT prof FROM w);
INSERT INTO litters (mate_id,litter_code,mated_on,expected_delivery_on,created_by)
SELECT (SELECT max(id) FROM mates),'BIZ','2026-08-10','2026-08-31',(SELECT prof FROM w);
WITH n AS (SELECT nextval('tasks_id_seq') id)
INSERT INTO tasks (id,origin_task_id,subject_mouse_id,task_type,due_date,status,actor_role,created_by)
SELECT id,id,(SELECT id FROM mouse_meta WHERE sex='F'),'check_plug','2026-08-11','open','professor',(SELECT prof FROM w) FROM n;
\echo '   -> ok'

\echo '#### S3 staff: 임신 확인 메모 (빨강=지시) ####'
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,subject_mouse_id,litter_id,signal,body,actor_id)
SELECT id,id,(SELECT id FROM mouse_meta WHERE sex='F'),(SELECT max(id) FROM litters),'instruction','260824 preg?',(SELECT prof FROM w) FROM n;
\echo '   -> ok'

\echo '#### S3b [문제탐지] 쥐 없이 litter 에만 달리는 메모 "no pups" ####'
SAVEPOINT s3b;
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,litter_id,signal,body,actor_id)
SELECT id,id,(SELECT max(id) FROM litters),'done','no pups',(SELECT prof FROM w) FROM n;
ROLLBACK TO s3b;

\echo '#### S4 출산: litter 확정 + 새끼 5마리 ####'
UPDATE litters SET birth_date='2026-08-31', pup_count=5 WHERE litter_code='BIZ';
INSERT INTO mouse_meta (litter_id,litter_code,pup_number,sex,dob)
SELECT (SELECT id FROM litters WHERE litter_code='BIZ'),'BIZ',n,'U','2026-08-31'
FROM generate_series(1,5) n;
\echo '   -> ok (신생아 sex=U)'

\echo '#### S5 [문제탐지] 이유 후 성별 판별: U -> M 으로 정정 ####'
SAVEPOINT s5;
UPDATE mouse_meta SET sex='M' WHERE litter_code='BIZ' AND pup_number=1;
SELECT sex||pup_number||litter_code AS label FROM mouse_meta WHERE litter_code='BIZ' AND pup_number=1;
RELEASE SAVEPOINT s5;

\echo '#### S6 이유: 새 케이지로 이동 (move + mice append) ####'
INSERT INTO mouse_moves (mouse_id,from_cage_id,to_cage_id,actor_id,reason,idempotency_key)
SELECT id,(SELECT min(id) FROM cages),(SELECT max(id) FROM cages),(SELECT staff FROM w),'wean',gen_random_uuid()
FROM mouse_meta WHERE litter_code='BIZ' AND pup_number<=3;
INSERT INTO mice (mouse_meta_id,cage_id,status,actor_id,change_note)
SELECT id,(SELECT max(id) FROM cages),'alive',(SELECT staff FROM w),'weaned'
FROM mouse_meta WHERE litter_code='BIZ' AND pup_number<=3;
\echo '   -> ok'

\echo '#### S7 조직채취/유전자형 날짜 ####'
INSERT INTO mouse_events (mouse_id,kind,occurred_on,raw_value)
SELECT id,'tissue_collection','2026-09-10','260910' FROM mouse_meta WHERE litter_code='BIZ' AND pup_number=1;
\echo '   -> ok'

\echo '#### S8 task 수명주기 open -> done -> verified ####'
INSERT INTO tasks (origin_task_id,subject_mouse_id,task_type,status,from_status,actor_role,created_by,done_by,done_at)
SELECT origin_task_id,subject_mouse_id,task_type,'done','open','staff',created_by,(SELECT staff FROM w),now()
FROM tasks WHERE from_status IS NULL;
INSERT INTO tasks (origin_task_id,subject_mouse_id,task_type,status,from_status,actor_role,created_by,verified_by,verified_at)
SELECT origin_task_id,subject_mouse_id,task_type,'verified','done','professor',created_by,(SELECT prof FROM w),now()
FROM tasks WHERE status='done';
SELECT DISTINCT ON (origin_task_id) origin_task_id,status FROM tasks ORDER BY origin_task_id,id DESC;

\echo '#### S9 [문제탐지] task 를 누구에게 배정하는가 ####'
SAVEPOINT s9;
UPDATE tasks SET assigned_to = 1 WHERE status='open';
ROLLBACK TO s9;

\echo '#### S10 케이지 격자 뷰: 케이지별 현재 마우스 ####'
SELECT c.cage_number, count(*) AS mice
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL ORDER BY mouse_meta_id,id DESC) cur
JOIN cages c ON c.id=cur.cage_id GROUP BY 1 ORDER BY 1;

\echo '#### S11 [문제탐지] 상태가 두 곳에: mice.status vs mouse_attr_logs ####'
INSERT INTO mouse_attr_logs (mouse_id,field,value,actor_id)
SELECT id,'status','dead',(SELECT staff FROM w) FROM mouse_meta WHERE litter_code='BIZ' AND pup_number=5;
SELECT 'mice.status' src, count(*) FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice ORDER BY mouse_meta_id,id DESC) x WHERE status='dead'
UNION ALL SELECT 'attr_logs', count(*) FROM mouse_attr_logs WHERE field='status' AND value='dead';
ROLLBACK;

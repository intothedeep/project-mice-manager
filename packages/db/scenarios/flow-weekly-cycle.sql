-- Professor/staff weekly cycle against the CURRENT schema.
-- Every step that once failed (scenarios P1-P7) is re-checked here.
-- Ends in ROLLBACK.
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO users (display_name,role,type) VALUES ('Dr.Lopez','professor','user'),('staff1','staff','user');
INSERT INTO users (display_name,type) VALUES ('Weekday staff','group');
INSERT INTO groups (user_id) SELECT id FROM users WHERE type='group';
INSERT INTO group_members (group_id,user_id)
SELECT (SELECT id FROM groups),(SELECT id FROM users WHERE display_name='staff1');
CREATE TEMP TABLE w AS SELECT
  (SELECT id FROM users WHERE role='professor') prof,
  (SELECT id FROM users WHERE display_name='staff1') staff,
  (SELECT id FROM users WHERE type='group') grp;
INSERT INTO colonies (name) VALUES ('MouseRoomSheet');
INSERT INTO mouse_lines (colony_id,name) SELECT id,'nNf1 flox;ccEGFP' FROM colonies;
INSERT INTO cages (line_id,cage_number) SELECT id,v FROM mouse_lines,(VALUES ('2475'),('2482')) t(v);
INSERT INTO slots (cage_id,label) SELECT id,'A8' FROM cages;

\echo '#### S1 import: 부모 2마리 (litter 포함 — 외부 쥐도 litter 를 받는다) ####'
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT v,true,(SELECT prof FROM w) FROM (VALUES ('BJA'),('BJB')) t(v);
INSERT INTO mouse_meta (litter_id,litter_code,line_id,pup_number,dob,raw_mouse_id)
SELECT id,litter_code,(SELECT id FROM mouse_lines),1,'2025-11-24',litter_code FROM litters;
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,effective_at)
SELECT id,(SELECT min(id) FROM cages),(SELECT min(id) FROM slots),'F',(SELECT prof FROM w),'import','2026-08-01'
FROM mouse_meta;
INSERT INTO mouse_genotypes (mouse_id,order_index,marker_text) SELECT id,1,'Nf1 f/+' FROM mouse_meta LIMIT 1;
\echo '   -> ok'

\echo '#### P4 같은 (litter, pup) 재삽입 -> 거부 ####'
SAVEPOINT p4;
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,litter_code,1 FROM litters LIMIT 1;
ROLLBACK TO p4;

\echo '#### P5 배치 전 쥐도 상태행을 갖는다 (cage/slot NULL) ####'
INSERT INTO litters (litter_code,is_from_outside,created_by) VALUES ('BJC',true,(SELECT prof FROM w));
INSERT INTO mouse_meta (litter_id,litter_code,pup_number) SELECT id,'BJC',1 FROM litters WHERE litter_code='BJC';
INSERT INTO mice (mouse_meta_id,sex,actor_id,reason)
SELECT id,'U',(SELECT prof FROM w),'created' FROM mouse_meta WHERE litter_code='BJC';
SELECT mm.litter_code, m.cage_id, m.is_alive, m.transit_status
FROM mice m JOIN mouse_meta mm ON mm.id=m.mouse_meta_id WHERE mm.litter_code='BJC';

\echo '#### P1 litter 메모 / 방 메모 (쥐 없이) ####'
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,litter_id,note_type,meta,signal_id,body,actor_id)
SELECT id,id,(SELECT min(id) FROM litters),'no_pups','{"checked_on":"2026-08-24"}',
       (SELECT id FROM signals WHERE type='done'),'no pups',(SELECT prof FROM w) FROM n;
WITH n AS (SELECT nextval('notes_id_seq') id)
INSERT INTO notes (id,origin_note_id,note_type,signal_id,body,actor_id)
SELECT id,id,'room_task',(SELECT id FROM signals WHERE type='instruction'),
       '260818 CHECK FOOD',(SELECT prof FROM w) FROM n;
SELECT n.note_type,n.body,s.color,n.subject_mouse_id,n.litter_id
FROM notes n JOIN signals s ON s.id=n.signal_id ORDER BY n.id;

\echo '#### P2 배정: 사람과 그룹이 같은 컬럼으로 ####'
WITH n AS (SELECT nextval('tasks_id_seq') id)
INSERT INTO tasks (id,origin_task_id,task_type,status,actor_role,created_by,assigned_to,direction)
SELECT id,id,'wean','open','professor',(SELECT prof FROM w),(SELECT grp FROM w),
       '{"target_cage":"2482","count":3}' FROM n;
WITH n AS (SELECT nextval('tasks_id_seq') id)
INSERT INTO tasks (id,origin_task_id,task_type,status,actor_role,created_by,assigned_to)
SELECT id,id,'genotype','open','professor',(SELECT prof FROM w),(SELECT staff FROM w) FROM n;
SELECT t.task_type,u.display_name AS assigned_to,u.type FROM tasks t JOIN users u ON u.id=t.assigned_to;
\echo '   내 태스크 = 직접 배정 + 소속 그룹'
SELECT task_type FROM tasks t WHERE t.assigned_to=(SELECT staff FROM w)
   OR t.assigned_to IN (SELECT g.user_id FROM groups g JOIN group_members gm ON gm.group_id=g.id
                        WHERE gm.user_id=(SELECT staff FROM w));

\echo '#### S8 task 수명주기 open -> done -> verified ####'
INSERT INTO tasks (origin_task_id,task_type,status,from_status,actor_role,created_by,done_by,done_at)
SELECT origin_task_id,task_type,'done','open','staff',created_by,(SELECT staff FROM w),now()
FROM tasks WHERE from_status IS NULL AND task_type='wean';
INSERT INTO tasks (origin_task_id,task_type,status,from_status,actor_role,created_by,verified_by,verified_at)
SELECT origin_task_id,task_type,'verified','done','professor',created_by,(SELECT prof FROM w),now()
FROM tasks WHERE status='done';
SELECT DISTINCT ON (origin_task_id) origin_task_id,status FROM tasks ORDER BY origin_task_id,id DESC;

\echo '#### P6/P7 이동 + 성별 정정 = mice 행 추가 (mouse_moves 없음) ####'
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,actor_id,reason,transit_status,effective_at,idempotency_key)
SELECT mouse_meta_id,(SELECT max(id) FROM cages),(SELECT max(id) FROM slots),'M',
       (SELECT staff FROM w),'weaned + sexed','verified','2026-09-01',gen_random_uuid()
FROM (SELECT DISTINCT ON (mouse_meta_id) mouse_meta_id FROM mice ORDER BY mouse_meta_id,id DESC) x LIMIT 1;
SELECT m.id,m.cage_id,m.sex,m.reason,m.effective_at::date
FROM mice m WHERE m.mouse_meta_id=(SELECT min(id) FROM mouse_meta) ORDER BY m.id;

\echo '#### P3 죽음: is_alive (살아있는데 사인 기록 -> 거부) ####'
SAVEPOINT p3;
INSERT INTO mice (mouse_meta_id,actor_id,is_alive,death_reason)
SELECT min(id),(SELECT staff FROM w),true,'sac' FROM mouse_meta;
ROLLBACK TO p3;
INSERT INTO mice (mouse_meta_id,actor_id,is_alive,death_reason,reason)
SELECT min(id),(SELECT staff FROM w),false,'sac','sacrificed' FROM mouse_meta;
SELECT DISTINCT ON (mouse_meta_id) is_alive,death_reason FROM mice
WHERE mouse_meta_id=(SELECT min(id) FROM mouse_meta) ORDER BY mouse_meta_id,id DESC;

\echo '#### S10 케이지 격자 (빈 케이지 포함) ####'
SELECT c.cage_number,count(cur.mouse_meta_id) AS mice
FROM cages c LEFT JOIN (SELECT DISTINCT ON (mouse_meta_id) * FROM mice
  WHERE deleted_at IS NULL ORDER BY mouse_meta_id,id DESC) cur ON cur.cage_id=c.id
GROUP BY 1 ORDER BY 1;
ROLLBACK;

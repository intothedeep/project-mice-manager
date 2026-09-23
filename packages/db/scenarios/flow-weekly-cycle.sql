-- Professor/staff weekly cycle against the R25 schema.
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
-- slots.label is globally unique; give each cage its own labelled slot
INSERT INTO slots (cage_id,label)
SELECT id, cage_number||'-A8' FROM cages;

\echo '#### S1 import: 부모 2마리 (litter 포함 — 외부 쥐도 litter 를 받는다) ####'
INSERT INTO litters (litter_code,is_from_outside,created_by)
SELECT v,true,(SELECT prof FROM w) FROM (VALUES ('BJA'),('BJB')) t(v);
-- R25: mouse_meta no longer has line_id; line_id lives on mice version rows
INSERT INTO mouse_meta (litter_id,litter_code,pup_number,dob,raw_mouse_id)
SELECT id,litter_code,1,'2025-11-24',litter_code FROM litters;
-- R25: line_id required on each mice version row; prev_id NULL for creation rows
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,effective_at)
SELECT mm.id,
       (SELECT c.id FROM cages c WHERE c.cage_number='2475'),
       (SELECT s.id FROM slots s WHERE s.label='2475-A8'),
       'F',(SELECT id FROM mouse_lines),(SELECT prof FROM w),'import','2026-08-01'
FROM mouse_meta mm;
-- R25: mouse_genotypes -> mice_genes; marker_text -> gene_id FK to genes.code
-- 0029/0030/0031: genes.code is BARE, zygosity lives on the LINK ROW as
-- allele_mat/allele_pat (MATERNAL FIRST -- 'f'/'+' is "the floxed copy came
-- from the mother", and '+'/'f' is a different mouse), and display order is the
-- catalogue's genes.sort_key. The same mouse still ends up reading 'Nf1 f/+';
-- only where each half of that string is stored has changed.
-- NO `INSERT INTO genes` HERE ANY MORE: 0030 seeds the catalogue, so an import
-- RESOLVES a code, it never creates a gene. Creating one here would be a second
-- home for the catalogue, which is what 0030 exists to prevent.
INSERT INTO mice_genes (mouse_id,gene_id,allele_mat,allele_pat)
SELECT id,(SELECT id FROM genes WHERE code='Nf1' AND deleted_at IS NULL),'f','+'
FROM mouse_meta LIMIT 1;
-- Verify the genotype string via the contract: one rendered marker per
-- mice_genes row, joined with ';' in genes.sort_key order. Both alleles NULL
-- renders the BARE code ("PlpCre", "WT") -- "not recorded" is a different fact from a
-- recorded '+'/'+' pair -- and a single NULL side shows as '?'. Same grammar as
-- lib/genotype.ts renderGene, which is the client half of this contract.
SELECT mm.litter_code,
       string_agg(CASE WHEN mg.allele_mat IS NULL AND mg.allele_pat IS NULL
                           THEN g.code
                       ELSE g.code || ' ' || coalesce(mg.allele_mat,'?')
                                   || '/' || coalesce(mg.allele_pat,'?')
                  END, ';' ORDER BY g.sort_key) AS genotype
FROM mouse_meta mm
JOIN mice_genes mg ON mg.mouse_id = mm.id
JOIN genes g ON g.id = mg.gene_id
GROUP BY mm.id, mm.litter_code;
\echo '   -> ok'

\echo '#### P4 같은 (litter, pup) 재삽입 -> 거부 ####'
SAVEPOINT p4;
INSERT INTO mouse_meta (litter_id,litter_code,pup_number)
SELECT id,litter_code,1 FROM litters LIMIT 1;
ROLLBACK TO p4;

\echo '#### P5 배치 전 쥐도 상태행을 갖는다 (cage/slot NULL) ####'
INSERT INTO litters (litter_code,is_from_outside,created_by) VALUES ('BJC',true,(SELECT prof FROM w));
INSERT INTO mouse_meta (litter_id,litter_code,pup_number) SELECT id,'BJC',1 FROM litters WHERE litter_code='BJC';
INSERT INTO mice (mouse_meta_id,sex,line_id,actor_id,reason)
SELECT id,'U',(SELECT id FROM mouse_lines),(SELECT prof FROM w),'created'
FROM mouse_meta WHERE litter_code='BJC';
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

\echo '#### S8 task 수명주기 open -> done -> verified (prev_id CAS 사용) ####'
-- R25: tasks have prev_id. Append with prev_id = head id for CAS safety.
INSERT INTO tasks (origin_task_id,task_type,status,from_status,actor_role,created_by,
                   assigned_to,direction,prev_id,done_by,done_at)
SELECT h.origin_task_id,h.task_type,'done','open','staff',h.created_by,
       h.assigned_to,h.direction,h.id,(SELECT staff FROM w),now()
FROM (SELECT DISTINCT ON (origin_task_id) * FROM tasks WHERE deleted_at IS NULL
      ORDER BY origin_task_id,id DESC) h
WHERE h.from_status IS NULL AND h.task_type='wean';
INSERT INTO tasks (origin_task_id,task_type,status,from_status,actor_role,created_by,
                   assigned_to,direction,prev_id,verified_by,verified_at)
SELECT h.origin_task_id,h.task_type,'verified','done','professor',h.created_by,
       h.assigned_to,h.direction,h.id,(SELECT prof FROM w),now()
FROM (SELECT DISTINCT ON (origin_task_id) * FROM tasks WHERE deleted_at IS NULL
      ORDER BY origin_task_id,id DESC) h
WHERE h.status='done';
SELECT DISTINCT ON (origin_task_id) origin_task_id,status FROM tasks ORDER BY origin_task_id,id DESC;

\echo '#### P6/P7 이동 + 성별 정정 = mice 행 추가 (mouse_moves 없음) ####'
-- R25: append must carry prev_id = head id; also carry line_id forward.
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,reason,
                  transit_status,effective_at,idempotency_key,prev_id)
SELECT prev.mouse_meta_id,
       (SELECT c.id FROM cages c WHERE c.cage_number='2482'),
       (SELECT s.id FROM slots s WHERE s.label='2482-A8'),
       'M',prev.line_id,(SELECT staff FROM w),'weaned + sexed','verified','2026-09-01',
       gen_random_uuid(),prev.id
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL
      ORDER BY mouse_meta_id,id DESC) prev
WHERE prev.mouse_meta_id=(SELECT min(id) FROM mouse_meta);
SELECT m.id,m.cage_id,m.sex,m.reason,m.effective_at::date,m.line_id
FROM mice m WHERE m.mouse_meta_id=(SELECT min(id) FROM mouse_meta) ORDER BY m.id;

\echo '#### P3 죽음: is_alive (살아있는데 사인 기록 -> 거부) ####'
SAVEPOINT p3;
INSERT INTO mice (mouse_meta_id,actor_id,is_alive,death_reason)
SELECT min(id),(SELECT staff FROM w),true,'sac' FROM mouse_meta;
ROLLBACK TO p3;
-- Correct append: carry full head state forward, set is_alive=false, prev_id=head id.
INSERT INTO mice (mouse_meta_id,cage_id,slot_id,sex,line_id,actor_id,
                  is_alive,death_reason,reason,prev_id)
SELECT prev.mouse_meta_id,prev.cage_id,prev.slot_id,prev.sex,prev.line_id,
       (SELECT staff FROM w),false,'sac','sacrificed',prev.id
FROM (SELECT DISTINCT ON (mouse_meta_id) * FROM mice WHERE deleted_at IS NULL
      ORDER BY mouse_meta_id,id DESC) prev
WHERE prev.mouse_meta_id=(SELECT min(id) FROM mouse_meta);
SELECT DISTINCT ON (mouse_meta_id) is_alive,death_reason FROM mice
WHERE mouse_meta_id=(SELECT min(id) FROM mouse_meta) ORDER BY mouse_meta_id,id DESC;

\echo '#### S10 케이지 격자 (빈 케이지 포함, 살아있는 쥐만 집계) ####'
SELECT c.cage_number,count(cur.mouse_meta_id) AS mice
FROM cages c LEFT JOIN (SELECT DISTINCT ON (mouse_meta_id) * FROM mice
  WHERE deleted_at IS NULL ORDER BY mouse_meta_id,id DESC) cur
  ON cur.cage_id=c.id AND cur.is_alive=true
GROUP BY 1 ORDER BY 1;
ROLLBACK;

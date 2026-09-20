## location

colonies: at this time, there is only 1 colony

mouse_lines: id is primary key, (line_name, colony_id) unique,

cages: id is primary key, cage_number unique where deleted_at is null ok, and I do not need these columns - import_batch_id / source_sheet / source_row

slots: id primary key, label unique

## mouse

mouse_meta: sex should be enum type: M, F, U and we should move mouse_meta.line_id to mice.line_id because it can be updatable.

mice: mice.line_id should be here. not update and insert a new row based latest same mouse_id record with update data. if a mouse does not have cage_id / slot_id, then I will show them in a section exception. explain more about mice.idempotency_key.

genes: create this table. id, code, label, desc

mouse_genotypes: name change from mouse_genotypes to mice_genes. mouse_id, gene_id. genotyp combine all records to get genotype.

mouse_events: delete this table. I will use tasks with protocol based

## breading

mates: this table updated based on tasks table records

## work

tasks: use protocol for task with json colum? what architecture can we use here? use fable to research tasks feature like task ticket systems, or how to communicate between people efficiently to complete a work feature in the web and find the best one. this is the key feature because we need to use this to maintain version. also task record should hold version column to prevent multi editing between members.

notes: where can we note? colony, cage, mouse_lines, mouse, slot, litters? use fable to research note feature in the web and find the best one.

## people

good

## import?

not yet at this version prototype

## 7 audit_logs

we need to track logs who did what? use fable to research how to log actions taken by members. its table structure and workflow and how to store?

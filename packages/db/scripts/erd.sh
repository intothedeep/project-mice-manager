#!/usr/bin/env bash
# Render an ERD straight from the live schema, so the diagram can never drift
# from the migrations the way a hand-drawn one does. Requires graphviz (`dot`).
set -euo pipefail
DB="${1:-colony_dev}"
OUT="${2:-packages/db/ERD}"

psql -d "$DB" -t -A -F'|' -c "
select c.conrelid::regclass::text, a.attname, c.confrelid::regclass::text
from pg_constraint c
join unnest(c.conkey) with ordinality k(att, ord) on true
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.att
where c.contype = 'f' and k.ord = 1
order by 1, 2;" > /tmp/erd_fks.txt

psql -d "$DB" -t -A -F'|' -c "
select t.relname, count(a.attname)
from pg_class t
join pg_namespace n on n.oid = t.relnamespace and n.nspname = 'public'
left join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
where t.relkind = 'r' and t.relname <> 'schema_migrations'
group by 1 order by 1;" > /tmp/erd_tables.txt

python3 - "$OUT" "${MODE:-full}" <<'PY'
import sys, collections
out = sys.argv[1]
tables = {}
for line in open('/tmp/erd_tables.txt'):
    if not line.strip(): continue
    n, c = line.strip().split('|'); tables[n] = int(c)
fks = []
for line in open('/tmp/erd_fks.txt'):
    if not line.strip(): continue
    src, col, dst = line.strip().split('|')
    if src in tables and dst in tables: fks.append((src, col, dst))

# CORE mode hides the two edge families that touch nearly every table
# (provenance import_batch_id, and every actor/user FK). They are real, but they
# connect everything to everything and bury the domain shape underneath.
NOISE_COLS = {'import_batch_id'}
NOISE_DSTS = {'users', 'import_batches'}
core = len(sys.argv) > 2 and sys.argv[2] == 'core'
if core:
    fks = [f for f in fks if f[1] not in NOISE_COLS and f[2] not in NOISE_DSTS]
    drop = {'import_batches', 'raw_sheet_rows', 'import_errors',
            'color_maps', 'audit_logs'}
    tables = {k: v for k, v in tables.items() if k not in drop}
    fks = [f for f in fks if f[0] in tables and f[2] in tables]

# Group by concern so the diagram reads as a story, not a hairball.
groups = {
  'location':  ['colonies','subcolonies','cages','slots'],
  'breeding':  ['mates','litters'],
  'mouse':     ['mouse_meta','mice','mouse_lines','mouse_genotypes','mouse_events'],
  'work':      ['tasks','notes','signals'],
  'people':    ['users','groups','group_members'],
  'history':   ['audit_logs'],
  'import':    ['import_batches','raw_sheet_rows','import_errors','color_maps'],
}
color = {'location':'#dbeafe','breeding':'#fce7f3','mouse':'#dcfce7',
         'work':'#fef3c7','people':'#fee2e2','history':'#e5e7eb','import':'#ede9fe'}
placed = {t for g in groups.values() for t in g}
groups['other'] = [t for t in tables if t not in placed]
color['other'] = '#ffffff'

L = ['digraph schema {', '  rankdir=LR;', '  graph [splines=spline, nodesep=0.35, ranksep=1.1, fontname="Helvetica"];',
     '  node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=11];',
     '  edge [color="#6b7280", arrowsize=0.7, fontname="Helvetica", fontsize=8];']
for g, members in groups.items():
    members = [m for m in members if m in tables]
    if not members: continue
    L.append(f'  subgraph cluster_{g} {{ label="{g}"; style="rounded,dashed"; color="#9ca3af"; fontsize=13;')
    for t in members:
        L.append(f'    "{t}" [label="{t}\\n({tables[t]} cols)", fillcolor="{color[g]}"];')
    L.append('  }')
for src, col, dst in fks:
    L.append(f'  "{src}" -> "{dst}" [label="{col}"];')
L.append('}')
open(out + '.dot', 'w').write('\n'.join(L) + '\n')
print(f'{len(tables)} tables, {len(fks)} foreign keys')
PY

dot -Tpng -Gdpi=140 "$OUT.dot" -o "$OUT.png"
dot -Tsvg "$OUT.dot" -o "$OUT.svg"
echo "wrote $OUT.png / $OUT.svg"

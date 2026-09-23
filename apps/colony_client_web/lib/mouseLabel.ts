import type { ColonyGrid } from '@repo/types';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';
import { mouseLabelOf } from '@/lib/mouseIdentity';

// Reclip count for a single mouse: number of Tissue collection cases that
// reached the "tissue taken and stored" milestone (status done or verified),
// excluding cancelled. A cancelled case never reached done → contributes 0.
// Matches both single-subject cases (subjectMouseId === metaId) and batch
// cases (mice includes metaId). deleted_at masking is handled upstream.
export function reclipCount(metaId: number, cases: ClientCaseCard[]): number {
    let count = 0;
    for (const c of cases) {
        if (c.caseType !== 'Tissue collection') continue;
        if (c.status !== 'done' && c.status !== 'verified') continue;
        const isSingleSubject = c.subjectMouseId === metaId;
        const isBatchMember = Array.isArray(c.mice) && c.mice.includes(metaId);
        if (isSingleSubject || isBatchMember) count++;
    }
    return count;
}

// Memoizable index builder — one pass over all cases → Map<metaId, count>.
// Guards against double-counting when subjectMouseId also appears in mice[].
export function buildReclipIndex(cases: ClientCaseCard[]): Map<number, number> {
    const index = new Map<number, number>();
    for (const c of cases) {
        if (c.caseType !== 'Tissue collection') continue;
        if (c.status !== 'done' && c.status !== 'verified') continue;
        // Collect unique metaIds this case applies to (avoid double-count).
        const ids = new Set<number>();
        if (c.subjectMouseId != null) ids.add(c.subjectMouseId);
        if (Array.isArray(c.mice)) {
            for (const id of c.mice) ids.add(id);
        }
        for (const id of ids) {
            index.set(id, (index.get(id) ?? 0) + 1);
        }
    }
    return index;
}

// Compose a rendered mouse label with its reclip suffix.
// N <= 1 → base (no suffix); N === 2 → `base.2`; N === 3 → `base.3`; etc.
export function composeMouseLabel(base: string, count: number): string {
    return count >= 2 ? `${base}.${count}` : base;
}

// metaId -> the FULLY composed mouse label (base + reclip suffix), walking the
// rack in grid order. The ONE place the two layers are joined: mouseIdentity
// builds the base, composeMouseLabel adds the ".N", and every render site that
// needs a mouse's displayed name reads it from here instead of keeping a copy.
// Insertion order is the rack walk, so callers that need a picker list can use
// the Map's own order rather than sorting again.
export function buildMouseLabelIndex(
    grid: ColonyGrid,
    cases: ClientCaseCard[]
): Map<number, string> {
    const reclip = buildReclipIndex(cases);
    const index = new Map<number, string>();
    for (const line of grid.lines) {
        for (const cage of line.cages) {
            for (const slot of cage.slots) {
                for (const mouse of slot.mice) {
                    index.set(
                        mouse.metaId,
                        composeMouseLabel(
                            mouseLabelOf(mouse),
                            reclip.get(mouse.metaId) ?? 0
                        )
                    );
                }
            }
        }
    }
    return index;
}

import type { ClientCaseCard } from '@/apis/getTasks.mock.api';

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

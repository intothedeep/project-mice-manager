import type { ColonyGrid } from '@repo/types';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';

// The ONE place a case's subject name is produced. Every kind that has an id
// or a code on the case resolves its name here from LIVE state; nothing reads
// a stored display string that could have gone stale beside the id it
// duplicates (9dda31d did this for 'mouse'; this module covers the rest).

// cageId -> the cage's CODE (GridCage.code, i.e. cages.code).
// Built by walking the rack, the same shape as buildMouseLabelIndex.
export function buildCageCodeIndex(grid: ColonyGrid): Map<number, string> {
    const index = new Map<number, string>();
    for (const line of grid.lines) {
        for (const cage of line.cages) {
            index.set(cage.cageId, cage.code);
        }
    }
    return index;
}

// A batch header, composed from the member ids in case_mice order. Same shape
// as every other subject name: the member names come from the shared mouse
// index, so a member's ".N" reclip suffix shows here exactly as it does on the
// grid and in the single-mouse picker.
function composeBatchLabel(
    metaIds: number[],
    mouseLabels: Map<number, string>
): string {
    const labels = metaIds.map((id) => mouseLabels.get(id) ?? '?');
    const head = labels.slice(0, 3).join(', ');
    return labels.length > 3
        ? `${labels.length} mice: ${head}…`
        : `${labels.length} mice: ${head}`;
}

// The subject name to render on a case card. Returns null when the case has no
// subject to name — the caller renders the kind badge instead.
export function resolveCaseSubjectLabel(
    c: ClientCaseCard,
    mouseLabels: Map<number, string>,
    cageCodes: Map<number, string>
): string | null {
    switch (c.subjectKind) {
        case 'mouse':
            return c.subjectMouseId != null
                ? (mouseLabels.get(c.subjectMouseId) ?? null)
                : null;
        case 'mice':
            return c.mice?.length
                ? composeBatchLabel(c.mice, mouseLabels)
                : null;
        case 'cage':
            return c.subjectCageId != null
                ? (cageCodes.get(c.subjectCageId) ?? null)
                : null;
        case 'litter':
            return c.subjectLitterCode ?? null;
        default:
            // 'mate', 'slot', 'line' and a null kind land here. Only 'mate'
            // ever holds a string: it names two mice and the case has one
            // mouse slot, so nothing on the row can resolve it (parked — the
            // owner's call once cases.subject_mate_id has mates rows to hit).
            // The rest carry null and the caller renders the kind badge.
            return c.subjectLabel ?? null;
    }
}

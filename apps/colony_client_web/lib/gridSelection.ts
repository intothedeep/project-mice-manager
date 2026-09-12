import type { ColonyGrid } from '@repo/types';

// Selection model for the unified colony body. Clicking any node highlights its
// ANCESTOR PATH (where it sits) + its SUBTREE (what it contains). This is the pure
// core: resolve a selection to full coordinates, then a single rule decides whether
// any rendered element is on that path/subtree.

export type SelLevel = 'line' | 'cage' | 'slot' | 'mouse';

export interface Selection {
    level: SelLevel;
    id: number;
}

export interface SelPath {
    lineId?: number;
    cageId?: number;
    slotId?: number;
    mouseId?: number;
}

export const LEVEL_RANK: Record<SelLevel, number> = {
    line: 1,
    cage: 2,
    slot: 3,
    mouse: 4,
};

// Walk the tree to resolve a selection to its full ancestor coordinates. A
// selected mouse does not know its cage/slot, so this one walk supplies them.
export function resolvePath(
    colony: ColonyGrid,
    sel: Selection | null
): SelPath {
    if (!sel) return {};
    for (const l of colony.lines) {
        if (sel.level === 'line') {
            if (l.lineId === sel.id) return { lineId: l.lineId };
            continue;
        }
        for (const c of l.cages) {
            if (sel.level === 'cage') {
                if (c.cageId === sel.id)
                    return { lineId: l.lineId, cageId: c.cageId };
                continue;
            }
            for (const s of c.slots) {
                if (sel.level === 'slot') {
                    if (s.slotId === sel.id)
                        return {
                            lineId: l.lineId,
                            cageId: c.cageId,
                            slotId: s.slotId,
                        };
                    continue;
                }
                for (const m of s.mice) {
                    if (m.metaId === sel.id)
                        return {
                            lineId: l.lineId,
                            cageId: c.cageId,
                            slotId: s.slotId,
                            mouseId: m.metaId,
                        };
                }
            }
        }
    }
    return {};
}

// Highlight rule: an element at `elemLevel` (line=1…mouse=4) with coords `ids` is
// lit iff it and the selection agree on every level up to min(elemLevel, selLevel).
// That single test yields BOTH the ancestor path (elemLevel < selLevel) and the
// subtree (elemLevel >= selLevel) the user asked for.
export function isOnSelection(
    path: SelPath,
    selLevel: SelLevel,
    elemLevel: number,
    ids: SelPath
): boolean {
    const k = Math.min(elemLevel, LEVEL_RANK[selLevel]);
    if (k >= 1 && ids.lineId !== path.lineId) return false;
    if (k >= 2 && ids.cageId !== path.cageId) return false;
    if (k >= 3 && ids.slotId !== path.slotId) return false;
    if (k >= 4 && ids.mouseId !== path.mouseId) return false;
    return true;
}

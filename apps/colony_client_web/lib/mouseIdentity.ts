// Pure mouse-identity composition — the SOLE builder of a base mouse label.
// No I/O, no Date, no store access.
//
// The rendered id is composed at READ time from parts that live on the DTO
// (MouseCell.pupNumber / litterCode / pupOffsets, plus active ear punches).
// It must never be parsed back apart (see packages/types/src/grid.ts
// MouseCell comment) — adding an offset means appending to pupOffsets, not
// string-splicing an existing label.
//
// The tissue-collection ".N" suffix is a SEPARATE, OUTER layer and stays in
// lib/mouseLabel.ts composeMouseLabel(base, count) — this module produces the
// base that wrapper receives; it does not know about reclip counts.

import type { MouseCell, Sex } from '@repo/types';

export interface MouseLabelParts {
    sex: Sex;
    pupNumber: number;
    pupOffsets: MouseCell['pupOffsets'];
    litterCode: string;
    // ACTIVE ear punches only (one 'e' per punch, so both ears -> "ee"). A
    // count, not PunchRef[]: the function stays pure/total and trivial to
    // hand-test without constructing punch rows; callers that only have
    // PunchRef[] filter+length at the call site.
    earPunchCount: number;
}

// Grammar: sex . pupNumber . (+offset)* . litterCode . (e x earPunchCount)
export function buildMouseLabel(parts: MouseLabelParts): string {
    const offsets = parts.pupOffsets.map((o) => `+${o}`).join('');
    const earMarks = 'e'.repeat(Math.max(0, parts.earPunchCount));
    return `${parts.sex}${parts.pupNumber}${offsets}${parts.litterCode}${earMarks}`;
}

// Effective pup number = birth number + sum of active offsets.
// COMPUTED ONLY — never stored, never a DTO field. Storing it would create a
// second source of truth for one number: it would drift the moment an
// offset is added or removed, silently disagreeing with pupNumber/pupOffsets
// until someone remembers to recompute it.
export function effectivePupNumber(pupNumber: number, pupOffsets: number[]): number {
    return pupOffsets.reduce((sum, offset) => sum + offset, pupNumber);
}

import type { Sex } from '@repo/types';

// RULE-DERIVED colour channels — pure functions of a mouse's own fields, computed
// at render. The ASSIGNED channels (genotype / line / mate) are NOT here: they
// arrive pre-resolved as hex on the DTO (the server resolves them from the colour
// tables; the mock seeds them). Keeping rule channels in code means "add the Nth
// rule colour" costs zero storage and can never go stale.
//
// Identity colours deliberately stay OUT of the reserved signal families
// (red/blue/yellow/gray = workflow state, see lib/signal.ts). Sex/age overlap
// those hues by nature, so they are dis-ambiguated by SCOPE: signals own the row
// spine + id text; identity colours own their own cells only.

// Sex tint — fixed meaning (♂ blue, ♀ pink, unknown neutral). Background ONLY:
// the id-cell text colour is owned by the signal channel, so sex must not set text.
// Light fills so many identity cells coexist without vibrating ("Excel highlight").
export const SEX_TINT: Record<Sex, string> = {
    M: 'bg-sky-100',
    F: 'bg-pink-100',
    U: '', // undecided → no colour (default cell background)
};

// Age threshold — a mouse is "old" past ♂ 1 year / ♀ ~10 months. Domain constants;
// unsexed (U) gets no age flag. Computed from dob + sex vs today, never stored.
const OLD_DAYS: Record<Sex, number | null> = {
    M: 365,
    F: 304,
    U: null,
};

export function isOldMouse(
    dob: string | null,
    sex: Sex,
    now: Date = new Date()
): boolean {
    if (!dob) return false;
    const limit = OLD_DAYS[sex];
    if (limit == null) return false;
    const ageDays = (now.getTime() - new Date(dob).getTime()) / 86_400_000;
    return ageDays > limit;
}

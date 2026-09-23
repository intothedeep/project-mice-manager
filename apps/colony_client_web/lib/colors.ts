import type { Sex } from '@repo/types';
import { TODAY } from '@/lib/dueDates';

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

// Life-stage — a maturity channel read straight from dob, so the professor sees
// "baby vs not" at a glance. Only the non-default stages get a fill (baby green,
// old amber); adult = no fill, matching WT-genotype-is-blank (keeps the grid calm
// so the outliers pop). Computed from dob + sex vs today, never stored.
//
// The baby/adult boundary is the SAME threshold that the slot overcrowding warning
// counts "adults" against (plan Q32) — one source of truth, so the green cells are
// exactly the mice NOT counted toward a slot's adult capacity.
export type LifeStage = 'baby' | 'adult' | 'old';

// Weaning age (~3 weeks). Below this = pup. Domain constant, professor-confirm (Q32:
// 21d is weaning; a stricter "adult" may be later — flip this one number if so).
const ADULT_MIN_DAYS = 21;

// "Old" past ♂ 1 year / ♀ ~10 months. Unsexed (U) never flags old (no basis).
const OLD_DAYS: Record<Sex, number | null> = {
    M: 365,
    F: 304,
    U: null,
};

// `now` defaults to the pinned TODAY, never the real clock. The fixture is
// authored against a fixed date, so a real `new Date()` silently ages it: the
// three newest mice drifted from baby to adult between 2026-09-08 and
// 2026-09-23, and with them the per-slot ADULT count that drives the
// over-capacity warning. A mock whose display depends on when you open it
// cannot be checked against a written expectation.
// SERVER ERA: the caller passes the real date; the default goes away with the
// mock, not before.
export function lifeStage(
    dob: string | null,
    sex: Sex,
    now: Date = new Date(TODAY)
): LifeStage {
    if (!dob) return 'adult'; // unknown dob → neutral (no fill)
    const ageDays = (now.getTime() - new Date(dob).getTime()) / 86_400_000;
    if (ageDays < ADULT_MIN_DAYS) return 'baby';
    const oldLimit = OLD_DAYS[sex];
    if (oldLimit != null && ageDays > oldLimit) return 'old';
    return 'adult';
}

// DOB-cell tint per stage. adult = text-only (default background, no fill).
export const DOB_TINT: Record<LifeStage, string> = {
    baby: 'bg-emerald-100 text-emerald-900',
    adult: 'text-muted-foreground',
    old: 'bg-amber-100 text-amber-900',
};

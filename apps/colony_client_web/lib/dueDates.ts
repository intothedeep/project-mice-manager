// Pure date-arithmetic helpers for the Upcoming / due view.
// All functions are deterministic: no I/O, no side effects.
// UTC-only math to avoid local-time midnight-shift bugs.

export const TODAY = '2026-09-08';

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later';

// Add n calendar days to an ISO date string, returning ISO string.
// Uses UTC setters to avoid local-timezone day-shift on parse.
export function addDays(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

// Signed day count from today to dueDate.
// Negative = overdue, 0 = today, positive = future.
export function daysUntil(dueDate: string, today: string = TODAY): number {
    const due = Date.UTC(
        Number(dueDate.slice(0, 4)),
        Number(dueDate.slice(5, 7)) - 1,
        Number(dueDate.slice(8, 10))
    );
    const now = Date.UTC(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)) - 1,
        Number(today.slice(8, 10))
    );
    return Math.round((due - now) / 86_400_000);
}

// Classify a due date relative to today.
// soon = tomorrow through +3 days (inclusive); today = exactly 0 days.
export function dueStatus(dueDate: string, today: string = TODAY): DueStatus {
    const n = daysUntil(dueDate, today);
    if (n < 0) return 'overdue';
    if (n === 0) return 'today';
    if (n <= 3) return 'soon';
    return 'later';
}

// --- Breeding date derivations ---

// From a mating occurred_at date: plug check is day +10.
export function plugCheckOn(matingDate: string): string {
    return addDays(matingDate, 10);
}

// From a mating occurred_at date: expected delivery is day +20.
export function expectedDeliveryOn(matingDate: string): string {
    return addDays(matingDate, 20);
}

// From a pup date-of-birth: wean at day +21.
export function weanOn(dob: string): string {
    return addDays(dob, 21);
}

// From a pup date-of-birth: genotyping at day +21 (same as wean window).
export function genotypeOn(dob: string): string {
    return addDays(dob, 21);
}

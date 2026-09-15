// Bijective base-26 codec for litter codes.
//
// WHY bijective: standard base-26 would map 0→nothing, making empty the zero.
// Bijective base-26 maps A=1..Z=26, AA=27..AZ=52, etc. — every positive ordinal
// has exactly one representation. This gives rollover for free: ZZZ→AAAA is just
// ordinal 18278→18279, no special-case needed.
//
// Litter codes are constrained to 3–5 uppercase letters (^[A-Z]{3,5}$).
// The minimum of 3 letters means ordinals < parseLitterCode("AAA")=703 are
// unreachable; that range is reserved for the codec's internal use and should
// never appear in real data.
//
// The '+' pooled-pup notation (e.g. "M4+10AZZ") and ear-tag suffixes (e.g. "e")
// are NOT litter codes — they are data anomalies in the fixture. Extraction must
// fail gracefully (return null) for those cases.

const LITTER_CODE_RE = /^[A-Z]{3,5}$/;

/**
 * Decode a bijective base-26 litter code to its ordinal.
 * Returns null if the code is not ^[A-Z]{3,5}$.
 */
export function parseLitterCode(code: string): number | null {
    if (!LITTER_CODE_RE.test(code)) return null;
    let n = 0;
    for (let i = 0; i < code.length; i++) {
        // bijective: each digit is 1-based (A=1..Z=26)
        n = n * 26 + (code.charCodeAt(i) - 64);
    }
    return n;
}

/**
 * Encode an ordinal ≥ 1 to a bijective base-26 litter code.
 * Returns at least 1 letter; callers produce 3-letter minimum codes by seeding
 * the counter above parseLitterCode("ZZ")=702.
 */
export function formatLitterCode(seq: number): string {
    let n = seq;
    let out = '';
    while (n > 0) {
        // rem is 0-based index (0..25); bijective so (n-1) % 26
        const rem = (n - 1) % 26;
        out = String.fromCharCode(65 + rem) + out;
        n = Math.floor((n - 1) / 26);
    }
    return out;
}

/**
 * Advance a litter code by one step. ZZZ→AAAA rollover is automatic because
 * the codec encodes ordinals and incrementing an ordinal is just +1.
 */
export function nextLitterCode(current: string): string {
    const ord = parseLitterCode(current);
    // If somehow called with an invalid code, return AAA as a safe fallback.
    if (ord === null) return 'AAA';
    return formatLitterCode(ord + 1);
}

/**
 * Extract the litter code from a renderedId (e.g. "M4BCW" → "BCW").
 * renderedId grammar: sex(1) + digits(1+) + litterCode + optional-suffix.
 * Returns null for ids that don't conform (pooled "+N" notation, ear-tag
 * suffixes like "e", short 2-letter codes like "WT" — deliberately excluded
 * so the seed scan doesn't misidentify fixture anomalies as litter codes).
 */
export function extractLitterCode(renderedId: string): string | null {
    // Strip leading sex char and digits — then validate what's left.
    // WHY ?? null: RegExp match groups are typed string|undefined; we need string|null.
    const match = renderedId.match(/^[MFU]\d+([A-Z]{3,5})$/);
    return match ? (match[1] ?? null) : null;
}

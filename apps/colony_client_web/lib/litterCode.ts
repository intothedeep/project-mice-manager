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

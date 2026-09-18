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
// The '+' pup-number-offset notation (e.g. "M4+10AZZ") CHAINS — a mouse
// renumbered on successive transfers accumulates one "+N" per transfer
// (e.g. "M1+10+20AZZ") — and ear-punch suffixes (e.g. "e", "ear") sit
// BEFORE or AFTER the letter code, never inside it — extractLitterCode below
// tolerates all of that and still returns the real code.

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
 * Extract the litter code from a mouseLabel (e.g. "M4BCW" → "BCW").
 * mouseLabel grammar: sex(1) + digits(1+) + repeated-offset("+N" REPEATED
 * once per transfer, e.g. "+10+20" after two renumbers) + optional-punch-mark
 * (trailing "e" REPEATED once per active ear punch — "ee" = both ears; legacy
 * "e"/"ear" BEFORE the code is parsed but no longer generated) + litterCode.
 * Tolerates all observed forms: "M6BFA", "M6BFAe", "M6eBFA", "M6+10eBFA",
 * "F10+1earAYY", "M1+10+20AZZ" all yield their embedded code. WHICH of the
 * two punch-mark positions is the "real" one (pre- vs post-code) is an OPEN
 * QUESTION to the lab owner — this function does not attempt to disambiguate
 * or infer punch state, it only extracts the code around it.
 * Still returns null for genuine non-conformers (e.g. a 2-letter "WT") so the
 * seed scan doesn't misidentify those as litter codes.
 *
 * FIXED 2026-09-16: the previous regex required the code to be the ENTIRE
 * remainder after sex+digits, so any punch suffix (e.g. "F10BEVe") failed to
 * match and the mouse silently dropped out of useLitterCodes / seed-litter
 * scanning — letting an auto-generated code collide with a real one.
 */
export function extractLitterCode(mouseLabel: string): string | null {
    // Strip leading sex char and digits, any number of "+N" offsets,
    // optional punch-mark on either side of the code, then validate what's
    // left.
    // WHY "ear" before "e" in the alternation: with "e" first, `F10+1earAYY`
    // would match the "e", leave lowercase "ar" ahead of the code group and
    // fail to match — only backtracking to "ear" succeeds; ordering the
    // longer alternative first avoids relying on that backtrack.
    // WHY ?? null: RegExp match groups are typed string|undefined; we need string|null.
    // WHY (?:\+\d+)* not (?:\+\d+)?: the pup-number offset ACCUMULATES across
    // successive transfers (e.g. "M1+10+20AZZ" after two renumbers) — a mouse
    // can carry a chain of offsets, not just one. This is the third instance
    // of this exact bug class in this file (see the FIXED 2026-09-16 note
    // above: a single trailing "e" and a repeated "ee" were the first two).
    // A missed offset form means extractLitterCode returns null, the mouse
    // silently drops out of useLitterCodes and the seed-litter max scan, and
    // an auto-generated litter code can collide with a real one already in
    // the data — wrong data, no error. Widening `?` to `*` is a strict
    // superset with no wrong-code risk: `+` and digits cannot appear inside
    // [A-Z]{3,5}, so the extra repetitions can only consume characters the
    // capture group could never have taken; every string that matched before
    // still matches with the same captured code.
    const match = mouseLabel.match(
        /^[MFU]\d+(?:\+\d+)*(?:ear|e)?([A-Z]{3,5})e*$/
    );
    return match ? (match[1] ?? null) : null;
}

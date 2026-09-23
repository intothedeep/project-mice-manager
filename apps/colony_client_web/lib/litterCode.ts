// Bijective base-26 codec for litter codes.
//
// WHY bijective: standard base-26 would map 0→nothing, making empty the zero.
// Bijective base-26 maps A=1..Z=26, AA=27..AZ=52, etc. — every positive ordinal
// has exactly one representation. This gives rollover for free: ZZZ→AAAA is just
// ordinal 18278→18279, no special-case needed.
//
// Generated litter codes are 3–5 uppercase letters, so the generator's floor is
// parseLitterCode("AAA")=703 and nothing below it can ever be issued.
//
// "WT" is the ONE sanctioned sub-703 code: it is the lab's standing label for
// wild-type stock, not a generated litter, and it is the most common litterCode
// in real data. It needs no special arithmetic — "WT" genuinely IS ordinal 618
// under this codec and round-trips through formatLitterCode. And because 618 is
// BELOW the 703 floor, advanceLitterCounter's Math.max(nextLitterOrd, 618+1)
// always keeps the existing counter, so a generated code can never collide
// with it.
//
// DO NOT relax this to {2,5}. The exception is an exact match on purpose — it
// admits "WT" and nothing else, so a two-letter typo ("AB", "ZZ") still fails
// the validation gate that parseLitterCode backs.

const LITTER_CODE_RE = /^([A-Z]{3,5}|WT)$/;

/**
 * Decode a bijective base-26 litter code to its ordinal.
 * Returns null if the code is not ^([A-Z]{3,5}|WT)$.
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
 * the counter above 702, the ordinal of "ZZ". Note 702 is an ARITHMETIC bound,
 * not a round trip: formatLitterCode(702)==="ZZ" but parseLitterCode("ZZ") is
 * null, because the decoder's regex rejects two letters (see its header).
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

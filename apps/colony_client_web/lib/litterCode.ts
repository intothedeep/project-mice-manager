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
//
// THE SAME DISTINCTION APPLIES BEYOND THIS FILE, and this is the note to find
// when you write the next rule about litters. "WT" is a STANDING LABEL, not a
// litter, so litter-wide invariants do not hold for it and must exempt it:
//
//   - same litterCode implies same DOB. True of AYL, AZZ, BCW — all three were
//     corrected on 2026-09-23 because they were not. FALSE of "WT", whose mice
//     carry nine different birth dates in the seed grid and correctly so:
//     wild-type stock is not a cohort born on one day.
//   - same litterCode implies one shared dam and sire, one mating, one
//     expected-delivery date. Also false for the same reason.
//
// A validator that treats "WT" as a litter will flag real data as broken. The
// rule is the same one that keeps it out of the ordinal space above: it is a
// name for animals that have no litter, not the name of a litter.

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

'use client';

// The genotyping-result cell: ONE gene's two alleles, maternal then paternal.
//
// NOT CodeBadgeSelect. That control is a multi-select over a flat option list —
// N independent on/off codes — and this is two INDEPENDENT SINGLE-VALUE slots
// over the same list, where "nothing picked" is a third state per slot rather
// than an empty selection. Bending badges into that shape would need a
// which-slot-am-I-toggling mode flag, so this is a separate control, exactly as
// CodeBadgeSelect itself was split out when two surfaces needed the same one.
//
// Presentational and controlled, like CodeBadgeSelect: it knows nothing about
// genes, the caller supplies the token list. MATERNAL IS LEFT (owner decision
// 2026-09-17, enforced at the renderer in lib/genotype.ts) — the two slots are
// not interchangeable and this control never reorders them.
export function AllelePairSelect({
    code,
    options,
    mat,
    pat,
    onChange,
}: {
    code: string;
    options: readonly string[];
    mat: string | null;
    pat: string | null;
    onChange: (next: { mat: string | null; pat: string | null }) => void;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 font-mono text-[11px]">{code}</span>
            <AlleleSlot
                label={`${code} maternal allele`}
                options={options}
                value={mat}
                onChange={(v) => onChange({ mat: v, pat })}
            />
            <span className="text-xs text-muted-foreground">/</span>
            <AlleleSlot
                label={`${code} paternal allele`}
                options={options}
                value={pat}
                onChange={(v) => onChange({ mat, pat: v })}
            />
        </div>
    );
}

// '' is the DOM's only empty option value, so it stands in for null on the way
// through the <select> and is mapped straight back. It is not a token and never
// reaches a GeneRef.
const NOT_RECORDED = '';

function AlleleSlot({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: readonly string[];
    value: string | null;
    onChange: (next: string | null) => void;
}) {
    // A value already on the row that the offered list does not contain still
    // has to be selectable, or opening the editor would silently blank it.
    const shown =
        value !== null && !options.includes(value)
            ? [...options, value]
            : options;

    return (
        <select
            aria-label={label}
            className="h-8 w-16 rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={value ?? NOT_RECORDED}
            onChange={(e) =>
                onChange(
                    e.target.value === NOT_RECORDED ? null : e.target.value
                )
            }
        >
            <option value={NOT_RECORDED}>—</option>
            {shown.map((token) => (
                <option
                    key={token}
                    value={token}
                >
                    {token}
                </option>
            ))}
        </select>
    );
}

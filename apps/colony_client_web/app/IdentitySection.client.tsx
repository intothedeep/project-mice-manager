'use client';

import { useState } from 'react';
import type { MouseCell, Sex } from '@repo/types';
import { Pencil } from 'lucide-react';
import { updateMouse } from '@/lib/mockColonyStore';
import { buildMouseLabel } from '@/lib/mouseIdentity';
import { composeMouseLabel } from '@/lib/mouseLabel';
import { formatDate } from '@/lib/dueDates';
import {
    ALLELE_TOKENS,
    allelePairsOf,
    geneCodesOf,
    genotypeOf,
    type AllelePair,
} from '@/lib/genotype';
import { GENE_CATALOG_CODES } from '@/apis/getGenes.mock.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeBadgeSelect } from '@/components/ui/code-badge-select';
import { AllelePairSelect } from '@/components/ui/allele-pair-select';
import { SELECT_CLASS, SEX_OPTIONS } from './AddMouseDialog.client';

// Task 13, field-editing half. Mounted with `key={metaId}` by the drawer so
// switching mice (or reopening on the same one) resets edit/draft state for
// free — no effect needed to re-sync a draft to a prop change.
//
// EDIT MODE, not per-field live commit (owner: several parts compose one
// label and the composed result must be visible BEFORE it is real): a
// pencil toggle opens a local draft, Save sends ONE atomic
// `updateMouse(metaId, patch)`, Cancel discards the draft untouched.

interface Draft {
    sex: Sex;
    // Picked gene CODES, never a genotype string: the genotype is composed from
    // the mouse's gene rows at read time (lib/genotype.ts) and editing it means
    // editing the ROWS. Deselecting everything is valid — that is '?', the
    // not-genotyped state a "check the genes" case is generated from.
    geneCodes: string[];
    // The genotyping RESULT per picked code — what the badges above cannot
    // say. Keyed by code and seeded from the mouse's own rows, so a draft
    // nobody touched is an exact copy and Save is a no-op. A code the user
    // deselects keeps its stale entry here on purpose: reselecting it within
    // the same edit restores the pair instead of silently clearing it, and
    // updateMouse only reads the codes that survived.
    alleles: Record<string, AllelePair>;
    dob: string; // '' stands in for MouseCell.dob === null while editing
}

function draftFrom(m: MouseCell): Draft {
    return {
        sex: m.sex,
        geneCodes: geneCodesOf(m),
        alleles: allelePairsOf(m),
        dob: m.dob ?? '',
    };
}

export function IdentitySection({
    mouse,
    reclipCount,
}: {
    mouse: MouseCell;
    reclipCount: number;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => draftFrom(mouse));
    const [error, setError] = useState<string | null>(null);

    function startEdit() {
        setDraft(draftFrom(mouse));
        setError(null);
        setEditing(true);
    }

    function cancel() {
        setEditing(false);
        setError(null);
    }

    function save() {
        const result = updateMouse(mouse.metaId, {
            sex: draft.sex,
            geneCodes: draft.geneCodes,
            geneAlleles: draft.alleles,
            dob: draft.dob,
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setEditing(false);
        setError(null);
    }

    const earPunchCount = mouse.punches.filter(
        (p) => p.location === 'ear'
    ).length;

    return (
        <section>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Identity
                </h3>
                {editing ? (
                    <div className="flex gap-1">
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={cancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="xs"
                            onClick={save}
                        >
                            Save
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="xs"
                        variant="ghost"
                        aria-label="Edit identity"
                        onClick={startEdit}
                    >
                        <Pencil className="size-3.5" />
                    </Button>
                )}
            </div>

            <div className="flex items-baseline gap-2 text-sm">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    label
                </span>
                <span className="font-mono">
                    {editing
                        ? composeMouseLabel(
                              buildMouseLabel({
                                  sex: draft.sex,
                                  pupNumber: mouse.pupNumber,
                                  pupOffsets: mouse.pupOffsets,
                                  litterCode: mouse.litterCode,
                                  earPunchCount,
                              }),
                              reclipCount
                          )
                        : composeMouseLabel(
                              buildMouseLabel({
                                  sex: mouse.sex,
                                  pupNumber: mouse.pupNumber,
                                  pupOffsets: mouse.pupOffsets,
                                  litterCode: mouse.litterCode,
                                  earPunchCount,
                              }),
                              reclipCount
                          )}
                </span>
            </div>

            {error ? (
                <p className="text-xs font-medium text-signal-instruction">
                    {error}
                </p>
            ) : null}

            {editing ? (
                <>
                    <Row label="sex">
                        <select
                            className={SELECT_CLASS}
                            value={draft.sex}
                            onChange={(e) => {
                                const next = SEX_OPTIONS.find(
                                    (s) => s === e.target.value
                                );
                                if (next)
                                    setDraft((d) => ({ ...d, sex: next }));
                            }}
                        >
                            {SEX_OPTIONS.map((s) => (
                                <option
                                    key={s}
                                    value={s}
                                >
                                    {s}
                                </option>
                            ))}
                        </select>
                    </Row>
                    <Row label="genotype">
                        <CodeBadgeSelect
                            options={GENE_CATALOG_CODES}
                            selected={draft.geneCodes}
                            onChange={(next) =>
                                setDraft((d) => ({ ...d, geneCodes: next }))
                            }
                        />
                    </Row>
                    {draft.geneCodes.length ? (
                        <div className="mt-2 flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">
                                alleles (mat/pat)
                            </span>
                            {draft.geneCodes.map((code) => {
                                const pair = draft.alleles[code] ?? {
                                    mat: null,
                                    pat: null,
                                };
                                return (
                                    <AllelePairSelect
                                        key={code}
                                        code={code}
                                        options={ALLELE_TOKENS}
                                        mat={pair.mat}
                                        pat={pair.pat}
                                        onChange={(next) =>
                                            setDraft((d) => ({
                                                ...d,
                                                alleles: {
                                                    ...d.alleles,
                                                    [code]: next,
                                                },
                                            }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    ) : null}
                    <Row label="dob">
                        <Input
                            type="date"
                            value={draft.dob}
                            onChange={(e) =>
                                setDraft((d) => ({
                                    ...d,
                                    dob: e.target.value,
                                }))
                            }
                        />
                    </Row>
                </>
            ) : (
                <>
                    <Field
                        k="sex"
                        v={mouse.isAlive ? mouse.sex : `${mouse.sex} (dead)`}
                    />
                    <Field
                        k="genotype"
                        v={genotypeOf(mouse)}
                    />
                    <Field
                        k="dob"
                        v={formatDate(mouse.dob)}
                    />
                </>
            )}

            {editing ? (
                <>
                    <ReadOnlyField
                        k="pup #"
                        v={String(mouse.pupNumber)}
                        reason="birth number, immutable"
                    />
                    <ReadOnlyField
                        k="litter"
                        v={mouse.litterCode}
                        reason="litter membership, not a text field"
                    />
                    <ReadOnlyField
                        k="offsets"
                        v={
                            mouse.pupOffsets.length
                                ? mouse.pupOffsets.map((o) => `+${o}`).join('')
                                : '—'
                        }
                        reason="assigned on transfer"
                    />
                    <ReadOnlyField
                        k="punches"
                        v={
                            mouse.punches.length
                                ? `${mouse.punches.length} active (${mouse.punches
                                      .map((p) => p.location)
                                      .join(', ')})`
                                : 'none'
                        }
                        reason="add/remove in Punches, below"
                    />
                    <ReadOnlyField
                        k=".N"
                        v={String(reclipCount)}
                        reason="changes when a Tissue-collection case reaches done/verified; not a field"
                    />
                </>
            ) : null}
        </section>
    );
}

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="mt-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {label}
            {children}
        </label>
    );
}

function Field({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {k}
            </span>
            <span className="font-mono">{v}</span>
        </div>
    );
}

function ReadOnlyField({
    k,
    v,
    reason,
}: {
    k: string;
    v: string;
    reason: string;
}) {
    return (
        <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {k}
            </span>
            <span className="font-mono text-muted-foreground/80">{v}</span>
            <span className="text-[10px] text-muted-foreground/60 italic">
                {reason}
            </span>
        </div>
    );
}

'use client';

import type { MouseCell, MouseDetail as Detail } from '@repo/types';
import { useEffect, useState } from 'react';
import { getMouseDetail } from '@/apis/getMouseDetail.mock.api';
import { signalIdClass } from '@/lib/signal';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SelectedMouse {
    mouse: MouseCell;
    lineName: string;
    cageNumber: string;
    slotLabel: string;
}

export function MouseDetailDrawer({
    selected,
    onClose,
}: {
    selected: SelectedMouse | null;
    onClose: () => void;
}) {
    const [detail, setDetail] = useState<Detail | null>(null);
    const metaId = selected?.mouse.metaId;

    useEffect(() => {
        if (metaId == null) return;
        let alive = true;
        setDetail(null);
        getMouseDetail(metaId).then((d) => {
            if (alive) setDetail(d);
        });
        return () => {
            alive = false;
        };
    }, [metaId]);

    const m = selected?.mouse;

    return (
        <Sheet
            open={selected != null}
            onOpenChange={(o) => !o && onClose()}
        >
            <SheetContent>
                {selected && m ? (
                    <>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        'font-mono',
                                        signalIdClass(m.signal)
                                    )}
                                >
                                    {m.renderedId}
                                </span>
                                <Badge
                                    variant={
                                        m.isAlive ? 'secondary' : 'outline'
                                    }
                                    className="text-[10px]"
                                >
                                    {m.isAlive ? m.sex : 'dead'}
                                </Badge>
                            </SheetTitle>
                            <p className="font-mono text-xs text-muted-foreground">
                                {selected.lineName} › cage {selected.cageNumber}{' '}
                                › slot {selected.slotLabel}
                            </p>
                        </SheetHeader>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                            {m.attention ? (
                                <p
                                    className={cn(
                                        'rounded-md bg-muted px-3 py-2 text-xs',
                                        signalIdClass(m.signal)
                                    )}
                                >
                                    {m.attention}
                                </p>
                            ) : null}

                            <Section label="Identity">
                                <Field
                                    k="genotype"
                                    v={m.genotype}
                                />
                                <Field
                                    k="dob"
                                    v={detail?.dob ?? '—'}
                                />
                                <Field
                                    k="litter"
                                    v={detail?.litterCode ?? '—'}
                                />
                            </Section>

                            <Section label="Genotype">
                                {detail && detail.genes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {detail.genes.map((g) => (
                                            <Badge
                                                key={g.code}
                                                variant="outline"
                                                className="font-mono text-[11px]"
                                            >
                                                {g.code} {g.allele}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <Muted>
                                        {detail
                                            ? 'no markers recorded (pending)'
                                            : 'loading…'}
                                    </Muted>
                                )}
                            </Section>

                            <Section label="Parents">
                                {detail && detail.parents.length > 0 ? (
                                    <ul className="space-y-1">
                                        {detail.parents.map((p) => (
                                            <li
                                                key={p.role}
                                                className="flex items-baseline gap-2 text-sm"
                                            >
                                                <span className="w-14 shrink-0 text-xs text-muted-foreground">
                                                    {p.role}
                                                </span>
                                                <span className="font-mono">
                                                    {p.label}
                                                </span>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {p.genotype}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Muted>
                                        {detail ? 'not recorded' : 'loading…'}
                                    </Muted>
                                )}
                            </Section>

                            <Section label="History — append-only">
                                {detail ? (
                                    <ol className="relative space-y-3 border-l border-border pl-4">
                                        {detail.history.map((h, i) => (
                                            <li
                                                key={i}
                                                className="relative"
                                            >
                                                <span className="absolute top-1 -left-[21px] size-2 rounded-full border border-background bg-primary/70" />
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-mono text-[11px] text-muted-foreground">
                                                        {h.at}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {h.actor}
                                                    </span>
                                                </div>
                                                <p className="text-[13px]">
                                                    {h.summary}
                                                </p>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <Muted>loading…</Muted>
                                )}
                            </Section>
                        </div>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function Section({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </h3>
            {children}
        </section>
    );
}

function Field({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-baseline gap-2 text-sm">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
                {k}
            </span>
            <span className="font-mono">{v}</span>
        </div>
    );
}

function Muted({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground italic">{children}</p>;
}

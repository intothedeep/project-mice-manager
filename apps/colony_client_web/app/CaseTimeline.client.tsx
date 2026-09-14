'use client';

import { useMemo } from 'react';
import { useTaskLog } from '@/lib/mockStore';
import type { ClientTask } from '@/apis/getTasks.mock.api';

// Append-only task log for one case, as a compact TABLE (date · by · status),
// chronological by id. Shared by the task board card, CaseList, and mouse detail.
export function CaseTimeline({ caseId }: { caseId: number }) {
    const taskLog = useTaskLog();
    const rows = useMemo(
        () =>
            taskLog
                .filter((t: ClientTask) => t.caseId === caseId)
                .sort((a: ClientTask, b: ClientTask) => a.id - b.id),
        [taskLog, caseId]
    );

    if (rows.length === 0) return null;

    return (
        <table className="w-full border-collapse text-[11px]">
            <thead>
                <tr className="text-left text-muted-foreground">
                    <th className="pr-2 pb-1 font-medium tracking-wide uppercase">
                        date
                    </th>
                    <th className="pr-2 pb-1 font-medium tracking-wide uppercase">
                        by
                    </th>
                    <th className="pb-1 font-medium tracking-wide uppercase">
                        status
                    </th>
                </tr>
            </thead>
            <tbody>
                {rows.map((t) => (
                    <tr
                        key={t.id}
                        className="border-t border-border/40 align-baseline"
                    >
                        <td className="py-0.5 pr-2 font-mono whitespace-nowrap text-muted-foreground">
                            {t.createdAt}
                        </td>
                        <td className="py-0.5 pr-2 text-muted-foreground">
                            {t.actor}
                        </td>
                        <td className="py-0.5 font-medium">{t.status}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

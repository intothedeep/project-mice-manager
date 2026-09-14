'use client';

import { useMemo } from 'react';
import { useTaskLog } from '@/lib/mockStore';
import { formatDate } from '@/lib/dueDates';
import type { ClientTask } from '@/apis/getTasks.mock.api';

// Append-only task log for one case — a vertical timeline (date · actor, then
// status), chronological by id. Shared by the task board card, CaseList, and
// mouse detail. Dates render YYYY/MM/DD via the shared formatDate.
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
        <ol className="relative space-y-3 border-l border-border pl-4">
            {rows.map((t) => (
                <li key={t.id} className="relative">
                    <span className="absolute top-1 -left-[21px] size-2 rounded-full border border-background bg-primary/70" />
                    <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {formatDate(t.createdAt)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {t.actor}
                        </span>
                    </div>
                    <p className="text-[13px] font-medium">{t.status}</p>
                </li>
            ))}
        </ol>
    );
}

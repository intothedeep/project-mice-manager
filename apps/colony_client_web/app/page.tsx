import { getColonyGrid } from '@/apis/getColonyGrid.mock.api';
import { SIGNAL_LABEL, SIGNAL_ORDER, signalSwatchClass } from '@/lib/signal';
import { cn } from '@/lib/utils';
import { ColonyGridView } from './ColonyGridView.client';

// Server Component: fetch the colony (mock now, colony_server later) and hand
// the resolved current-state tree to the interactive view. The fetch sits
// exactly where the real API call will go.

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Legend</span>
            {SIGNAL_ORDER.map((s) => (
                <span
                    key={s}
                    className="inline-flex items-center gap-1.5"
                >
                    <span
                        className={cn(
                            'inline-block size-3 rounded-sm border',
                            signalSwatchClass(s)
                        )}
                        aria-hidden
                    />
                    {SIGNAL_LABEL[s]}
                </span>
            ))}
        </div>
    );
}

export default async function HomePage() {
    const colony = await getColonyGrid(1);

    return (
        <main className="mx-auto max-w-[1400px] px-6 py-6">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {colony.colonyName}
                    </h1>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        colony › line › cage › slot › mouse
                    </p>
                </div>
                <Legend />
            </header>
            <ColonyGridView initial={colony} />
        </main>
    );
}

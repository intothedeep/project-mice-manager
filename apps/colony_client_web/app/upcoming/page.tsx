import { getUpcoming } from '@/apis/getUpcoming.mock.api';
import { UpcomingView } from '../UpcomingView.client';

// Server Component: fetch the upcoming due-date queue (mock now, colony_server
// later) and hand it to the interactive board.

export default async function UpcomingPage() {
    const items = await getUpcoming();

    return (
        <main className="mx-auto max-w-[1400px] px-6 py-6">
            <header className="mb-4">
                <h1 className="text-xl font-semibold tracking-tight">
                    Upcoming &amp; due
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Plug checks, deliveries, weans and genotyping — dates
                    computed automatically from mating and birth records.
                </p>
            </header>
            <UpcomingView initial={items} />
        </main>
    );
}

import { UpcomingView } from '../UpcomingView.client';

// Server Component shell; the board reads the shared client store (mock era) so
// mate follow-ups auto-cascaded from the Task bin appear here. Swaps to
// react-query + the real endpoint later.

export default function UpcomingPage() {
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
            <UpcomingView />
        </main>
    );
}

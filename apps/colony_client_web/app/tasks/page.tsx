import { TasksView } from '../TasksView.client';

// Server Component shell; the board reads the shared client store (mock era)
// so tasks created here — and their auto-cascaded follow-ups — persist across
// route navigation. Swaps to react-query + the real endpoint later.

export default function TasksPage() {
    return (
        <main className="mx-auto min-h-0 w-full max-w-[1400px] flex-1 overflow-auto px-6 py-6">
            <header className="mb-4">
                <h1 className="text-xl font-semibold tracking-tight">
                    Task bin
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    The weekly loop that replaces hand-versioned Excel.
                </p>
            </header>
            <TasksView />
        </main>
    );
}

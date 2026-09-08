import { getTasks } from '@/apis/getTasks.mock.api';
import { TasksView } from '../TasksView.client';

// Server Component: fetch the task queue (mock now, colony_server later) and
// hand it to the interactive board.

export default async function TasksPage() {
    const tasks = await getTasks();

    return (
        <main className="mx-auto max-w-[1400px] px-6 py-6">
            <header className="mb-4">
                <h1 className="text-xl font-semibold tracking-tight">
                    Task bin
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    The weekly loop that replaces hand-versioned Excel.
                </p>
            </header>
            <TasksView initial={tasks} />
        </main>
    );
}

import { getColonyGrid } from '@/apis/getColonyGrid.mock.api';
import { ColonyGridView } from './ColonyGridView.client';

// Server Component: fetch the colony (mock now, colony_server later) and hand
// the resolved current-state tree to the interactive view. The fetch sits
// exactly where the real API call will go.

export default async function HomePage() {
    const colony = await getColonyGrid(1);

    return (
        <main className="mx-auto max-w-[1400px] px-6 py-6">
            <ColonyGridView initial={colony} />
        </main>
    );
}

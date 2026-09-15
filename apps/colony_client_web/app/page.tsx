import { ColonyGridView } from './ColonyGridView.client';

// Colony data is now owned by the mock colony store (lib/mockColonyStore.ts),
// seeded from SEED_COLONY at module init. This page no longer fetches — it just
// mounts the client view. When the real server lands, getColonyGrid() in the
// mock api file is the swap seam (replace store seed with a fetch there).

export default function HomePage() {
    return (
        <main className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-6 py-3">
            <ColonyGridView />
        </main>
    );
}

import { getPalette, CHANNEL_ORDER } from '@/apis/getPalette.mock.api';
import type { PaletteChannel, PaletteEntry } from '@/apis/getPalette.mock.api';
import { cn } from '@/lib/utils';

// Readable channel heading labels.
const CHANNEL_LABEL: Record<PaletteChannel, string> = {
    signal: 'Signal',
    sex: 'Sex',
    'life-stage': 'Life-stage',
    overcrowding: 'Overcrowding',
    genotype: 'Genotype',
    mate: 'Mate',
    theme: 'Theme',
};

// Group entries by channel, preserving CHANNEL_ORDER.
function groupByChannel(
    entries: PaletteEntry[]
): { channel: PaletteChannel; rows: PaletteEntry[] }[] {
    const map = new Map<PaletteChannel, PaletteEntry[]>();
    for (const entry of entries) {
        const list = map.get(entry.channel) ?? [];
        list.push(entry);
        map.set(entry.channel, list);
    }
    return CHANNEL_ORDER.filter((ch) => map.has(ch)).map((ch) => ({
        channel: ch,
        rows: map.get(ch)!,
    }));
}

export default async function PalettePage() {
    const entries = await getPalette();
    const groups = groupByChannel(entries);

    return (
        <main className="mx-auto min-h-0 w-full max-w-[1400px] flex-1 overflow-auto px-6 py-6">
            <header className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight">
                    Colour Palette
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Every colour the app uses, grouped by channel. Mock — swaps
                    to the real <code>color_palette</code> table in one file.
                </p>
            </header>

            <div className="flex flex-col gap-8">
                {groups.map(({ channel, rows }) => (
                    <section key={channel}>
                        <h2 className="mb-2 text-sm font-semibold tracking-tight">
                            {CHANNEL_LABEL[channel]}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
                            </span>
                        </h2>
                        <table className="w-full border-collapse border text-xs">
                            <thead>
                                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                                    <th className="border-r px-2 py-1 font-medium">
                                        ID
                                    </th>
                                    <th className="border-r px-2 py-1 font-medium">
                                        Swatch
                                    </th>
                                    <th className="border-r px-2 py-1 font-medium">
                                        Token
                                    </th>
                                    <th className="border-r px-2 py-1 font-medium">
                                        Hex / Var
                                    </th>
                                    <th className="px-2 py-1 font-medium">
                                        Usage
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-b last:border-b-0 hover:bg-muted/20"
                                    >
                                        <td className="border-r px-2 py-1 text-muted-foreground">
                                            {entry.id}
                                        </td>
                                        <td className="border-r px-2 py-1">
                                            {/* border required: --background and light fills are invisible without hairline */}
                                            <div
                                                className={cn(
                                                    'size-5 border border-border'
                                                )}
                                                style={{
                                                    backgroundColor: entry.hex,
                                                }}
                                            />
                                        </td>
                                        <td className="border-r px-2 py-1 font-mono">
                                            {entry.token}
                                        </td>
                                        <td className="border-r px-2 py-1 font-mono text-[10px] text-muted-foreground">
                                            {entry.hex}
                                        </td>
                                        <td className="px-2 py-1 text-muted-foreground">
                                            {entry.usage}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                ))}
            </div>
        </main>
    );
}

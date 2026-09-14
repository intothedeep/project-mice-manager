'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavSlotAnchor } from './NavSlot.client';

const LINKS = [
    { href: '/', label: 'Cages' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/upcoming', label: 'Upcoming' },
    { href: '/palette', label: 'Palette' },
];

export function NavBar() {
    const path = usePathname();
    const slotRef = useNavSlotAnchor();
    return (
        <header className="sticky top-0 z-30 shrink-0 border-b bg-background/85 backdrop-blur">
            {/* fixed height so the search trigger vs. overlay never changes nav size */}
            <div className="mx-auto flex h-10 max-w-[1400px] items-center gap-4 px-4">
                <span className="text-sm font-semibold tracking-tight">
                    Lopez-Juarez Lab
                </span>
                <nav className="flex items-center gap-0.5">
                    {LINKS.map((l) => {
                        const active =
                            l.href === '/'
                                ? path === '/'
                                : path.startsWith(l.href);
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cn(
                                    'px-2 py-0.5 text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                </nav>
                {/* page-specific slot (Cages page portals its search+filter here) */}
                <div
                    ref={slotRef}
                    className="ml-auto flex min-w-0 items-center"
                />
            </div>
        </header>
    );
}

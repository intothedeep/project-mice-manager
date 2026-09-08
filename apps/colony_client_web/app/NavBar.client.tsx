'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
    { href: '/', label: 'Cages' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/upcoming', label: 'Upcoming' },
];

export function NavBar() {
    const path = usePathname();
    return (
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-2.5">
                <span className="font-semibold tracking-tight">
                    Lopez-Juarez Lab
                </span>
                <nav className="flex items-center gap-1">
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
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
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
            </div>
        </header>
    );
}

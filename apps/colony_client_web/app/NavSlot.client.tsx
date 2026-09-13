'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Portal anchor for page-specific content in the shared NavBar. The NavBar lives
// in the root layout, but the Cages page owns its filter state — so instead of
// lifting that state up, the page portals its search UI INTO this slot. Keeps
// filter ownership in ColonyGridView (SRP) while reclaiming the toolbar row.

type NavSlot = {
    node: HTMLElement | null;
    register: (el: HTMLElement | null) => void;
};

const NavSlotContext = createContext<NavSlot | null>(null);

export function NavSlotProvider({ children }: { children: ReactNode }) {
    const [node, setNode] = useState<HTMLElement | null>(null);
    return (
        <NavSlotContext.Provider value={{ node, register: setNode }}>
            {children}
        </NavSlotContext.Provider>
    );
}

// NavBar side: a callback ref that registers the anchor element.
export function useNavSlotAnchor(): (el: HTMLElement | null) => void {
    return useContext(NavSlotContext)?.register ?? (() => {});
}

// Consumer side: the live anchor node to portal into (null until NavBar mounts).
export function useNavSlotNode(): HTMLElement | null {
    return useContext(NavSlotContext)?.node ?? null;
}

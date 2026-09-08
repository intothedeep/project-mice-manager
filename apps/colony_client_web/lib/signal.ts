import type { SignalColor } from '@repo/types';

// Maps a workflow signal to its label + the Tailwind classes that render the
// Excel encoding. Chroma lives ONLY here so the meaning stays in one place.

export const SIGNAL_LABEL: Record<SignalColor, string> = {
    done: 'done',
    instruction: 'instruction',
    plan: 'plan',
    flag: 'attention',
    dead: 'sac / dead',
};

export const SIGNAL_ORDER: SignalColor[] = [
    'done',
    'instruction',
    'plan',
    'flag',
    'dead',
];

// Row background (fill signals) — flag/dead paint the cell like the sheet.
export function signalRowClass(signal: SignalColor): string {
    switch (signal) {
        case 'flag':
            return 'bg-signal-flag-fill';
        case 'dead':
            return 'bg-signal-dead-fill';
        default:
            return '';
    }
}

// Mouse-id colour (font signals) — instruction/plan tint the code itself.
export function signalIdClass(signal: SignalColor): string {
    switch (signal) {
        case 'instruction':
            return 'text-signal-instruction';
        case 'plan':
            return 'text-signal-plan';
        case 'dead':
            return 'text-signal-dead-ink line-through';
        default:
            return 'text-foreground';
    }
}

// Legend swatch style.
export function signalSwatchClass(signal: SignalColor): string {
    switch (signal) {
        case 'instruction':
            return 'border-signal-instruction';
        case 'plan':
            return 'border-signal-plan';
        case 'flag':
            return 'bg-signal-flag-fill border-signal-flag-line';
        case 'dead':
            return 'bg-signal-dead-fill border-border';
        default:
            return 'bg-foreground border-foreground';
    }
}

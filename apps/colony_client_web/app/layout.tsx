import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { NavBar } from './NavBar.client';

// Whole-UI IBM Plex Mono (user directive) — bound to BOTH --font-sans and
// --font-mono so every surface renders in Plex Mono, matching the technical,
// square, dark-line direction.
const mono = IBM_Plex_Mono({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Colony — Lopez-Juarez Lab',
    description: 'Mouse-colony management',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={mono.variable}
        >
            <body className="flex h-dvh flex-col overflow-hidden font-mono antialiased">
                <NavBar />
                {children}
            </body>
        </html>
    );
}

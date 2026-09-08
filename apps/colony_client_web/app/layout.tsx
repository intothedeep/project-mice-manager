import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { NavBar } from './NavBar.client';

const sans = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

const mono = JetBrains_Mono({
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
            className={`${sans.variable} ${mono.variable}`}
        >
            <body className="font-sans antialiased">
                <NavBar />
                {children}
            </body>
        </html>
    );
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SziaSors – Találkozz valakivel újjal', description: 'Magyar random videóchat, megyeválasztással.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="hu"><body>{children}</body></html>; }

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Tournament Operations Copilot',
  description: 'AI assistant for sports tournament operations staff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

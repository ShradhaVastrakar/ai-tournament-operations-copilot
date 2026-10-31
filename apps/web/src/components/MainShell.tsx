'use client';

import { usePathname } from 'next/navigation';

// The assistant is a full-bleed app shell; every other page uses the centred container.
export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/assistant') return <main>{children}</main>;
  return <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>;
}

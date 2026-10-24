'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Matches' },
  { href: '/assistant', label: 'AI Assistant' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-gray-200 px-4 py-3 flex items-center gap-6">
      <span className="font-semibold text-sm tracking-tight">⚽ Copilot</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm transition-colors ${
            pathname === href ? 'text-black font-medium' : 'text-gray-500 hover:text-black'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

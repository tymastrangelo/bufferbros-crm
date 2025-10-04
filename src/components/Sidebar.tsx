// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Clients', href: '/clients' },
  { name: 'Vehicles', href: '/vehicles' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <h1 className="text-2xl font-bold text-gray-100">Buffer Bros</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              pathname.startsWith(link.href) ? 'bg-primary-800 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}

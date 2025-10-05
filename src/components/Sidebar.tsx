// src/components/Sidebar.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Clients', href: '/clients' },
  { name: 'Vehicles', href: '/vehicles' },
  { name: 'Expenses', href: '/expenses' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <Link href="/dashboard">
          <Image
            src="/logo.png" // Place your logo in the /public folder
            alt="Buffer Bros Logo"
            width={150} // Adjust to your logo's width
            height={40}  // Adjust to your logo's height
          />
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              pathname.startsWith(link.href) ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}

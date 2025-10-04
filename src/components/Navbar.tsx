// src/components/Navbar.tsx
'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'

export default function Navbar() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-end px-6">
      <button
        onClick={handleSignOut}
        className="px-4 py-2 text-sm font-semibold text-gray-200 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
      >
        Sign Out
      </button>
    </header>
  )
}

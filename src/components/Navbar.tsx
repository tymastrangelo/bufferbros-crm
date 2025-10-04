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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <button
        onClick={handleSignOut}
        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
      >
        Sign Out
      </button>
    </header>
  )
}

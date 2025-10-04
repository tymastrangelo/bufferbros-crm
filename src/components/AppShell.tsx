'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show the shell on the login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
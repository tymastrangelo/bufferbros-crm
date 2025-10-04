'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

interface QuoteSubmission {
  id: number;
  created_at: string;
  full_name: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    
    const { data, error } = await supabase
      .from('quote_submissions')
      .select('id, created_at, full_name, status')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setQuotes(data)
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of new quote submissions.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Quote Submissions</h3>
        </div>
        <div className="border-t border-gray-200">
          {quotes.length === 0 ? (
            <p className="text-center text-gray-500 p-6">No new quote submissions.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quote.full_name}</div>
                      <div className="text-sm text-gray-500">Quote #{quote.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/quotes/${quote.id}`} className="text-primary-600 hover:text-primary-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}
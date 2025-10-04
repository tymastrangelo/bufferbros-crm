'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Suspense } from 'react'

interface UpcomingJob {
  id: number;
  scheduled_date: string;
  clients: { full_name: string } | null | { full_name: string }[]; // Allow for array or single object
}
interface QuoteSubmission {
  id: number;
  created_at: string;
  full_name: string;
  status: string;
}

function Dashboard() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteSubmission[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([])
  const [stats, setStats] = useState({ newQuotes: 0, scheduledJobs: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const statusColors: { [key: string]: string } = {
    new: 'bg-green-100 text-green-800',
    contacted: 'bg-blue-100 text-blue-800',
    quoted: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-purple-100 text-purple-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-800',
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }

    const today = new Date().toISOString()

    const [quotesRes, jobsRes, statsRes] = await Promise.all([
      // Fetch recent quotes
      supabase.from('quote_submissions').select('id, created_at, full_name, status').order('created_at', { ascending: false }).limit(5),
      // Fetch upcoming jobs
      supabase.from('jobs').select('id, scheduled_date, clients(full_name)').eq('status', 'scheduled').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(5),
      // Fetch stats
      supabase.from('quote_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new')
    ])

    const { data: quotesData, error: quotesError } = quotesRes
    const { data: jobsData, error: jobsError } = jobsRes
    const { count: newQuotesCount, error: statsError } = statsRes

    if (quotesError || jobsError || statsError) {
      setError(quotesError?.message || jobsError?.message || statsError?.message || 'An unknown error occurred')
    } else {
      // The type from Supabase can be an array for related tables, so we cast it.
      // We know from our schema it will be a single object.
      const typedJobsData = jobsData as unknown as UpcomingJob[];
      setQuotes(quotesData || []);
      setUpcomingJobs(jobsData || [])
      setStats({
        newQuotes: newQuotesCount || 0,
        // We can use the length of the jobsData for upcoming jobs count if we don't need a separate query for it
        // For now, let's assume we want a total count of all scheduled jobs, not just the next 5
        scheduledJobs: jobsData?.length || 0, // This can be a separate count query for accuracy if needed
      })
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
    <div className="p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Your business at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">New Quotes</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.newQuotes}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Upcoming Jobs</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.scheduledJobs}</p>
        </div>
        {/* Add more stat cards here as needed */}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Quotes Column */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Quote Submissions</h3>
            <Link href="/quotes" className="text-sm font-medium text-primary-600 hover:text-primary-800">View All</Link>
          </div>
          <div className="border-t border-gray-200">
            {quotes.length === 0 ? (
              <p className="text-center text-gray-500 p-6">No new quote submissions.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <li key={quote.id} className="p-4 hover:bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{quote.full_name}</p>
                      <p className="text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${statusColors[quote.status] || 'bg-gray-100 text-gray-800'}`}>
                        {quote.status}
                      </span>
                      <Link href={`/quotes/${quote.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Jobs Column */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Jobs</h3>
            <Link href="/jobs" className="text-sm font-medium text-primary-600 hover:text-primary-800">View All</Link>
          </div>
          <div className="border-t border-gray-200">
            {upcomingJobs.length === 0 ? (
              <p className="text-center text-gray-500 p-6">No upcoming jobs scheduled.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {upcomingJobs.map((job) => (
                  <li key={job.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {/* Handle both single object and array from Supabase type */}
                        {job.clients && !Array.isArray(job.clients)
                          ? job.clients.full_name
                          : 'Unknown Client'}
                      </p>
                      <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
                        Details
                      </Link>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(job.scheduled_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-center p-6 text-gray-400">Loading dashboard...</div>}>
      <Dashboard />
    </Suspense>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Suspense } from 'react'
import { type FinancialStats } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface UpcomingJob {
  id: number;
  scheduled_date: string;
  clients: { full_name: string } | null | { full_name: string }[]; // Allow for array or single object
}
interface PendingJob {
  id: number;
  total_price: number;
  clients: { full_name: string } | { full_name: string }[] | null;
}
interface QuoteSubmission {
  id: number;
  created_at: string;
  full_name: string;
  status: string;
}

interface ChartData {
  name: string; // e.g., "Jan 24"
  revenue: number;
  expenses: number;
}

function Dashboard() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteSubmission[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([])
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([])
  const [pendingPayout, setPendingPayout] = useState(0)
  const [stats, setStats] = useState({ newQuotes: 0, scheduledJobs: 0 })
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    runningBalance: 0,
    businessShare: 0,
    totalExpenses: 0,
    paidJobsCount: 0,
  })
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [chartTotals, setChartTotals] = useState({ revenue: 0, expenses: 0 })
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

    const [quotesRes, jobsRes, pendingJobsRes, statsRes, paidJobsRes, expensesRes] = await Promise.all([
      // Fetch recent quotes
      supabase.from('quote_submissions').select('id, created_at, full_name, status').order('created_at', { ascending: false }).limit(5),
      // Fetch upcoming jobs
      supabase.from('jobs').select('id, scheduled_date, clients(full_name)').eq('status', 'scheduled').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).limit(5),
      // Fetch completed but not paid jobs
      supabase.from('jobs').select('id, total_price, clients(full_name)').eq('status', 'completed'),
      // Fetch stats
      supabase.from('quote_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'), // For new quotes count
      // Fetch all paid jobs for financial calculations
      supabase.from('jobs').select('total_price, scheduled_date').eq('status', 'paid'),
      // Fetch all expenses with their dates
      supabase.from('expenses').select('amount, date'),
    ])

    const { data: quotesData, error: quotesError } = quotesRes
    const { data: jobsData, error: jobsError } = jobsRes
    const { data: pendingJobsData, error: pendingJobsError } = pendingJobsRes
    const { count: newQuotesCount, error: statsError } = statsRes
    const { data: paidJobsData, error: paidJobsError } = paidJobsRes
    const { data: expensesData, error: expensesError } = expensesRes

    if (quotesError || jobsError || pendingJobsError || statsError || paidJobsError || expensesError) {
      setError(
        quotesError?.message ||
        jobsError?.message ||
        statsError?.message ||
        paidJobsError?.message ||
        expensesError?.message ||
        'An unknown error occurred'
      )
    } else {
      // --- Pending Payout Calculations ---
      const totalPendingRevenue = pendingJobsData?.reduce((acc, job) => acc + (job.total_price || 0), 0) || 0
      const pendingBusinessShare = totalPendingRevenue * 0.60
      setPendingPayout(pendingBusinessShare)
      setPendingJobs(pendingJobsData || [])

      // --- Financial Calculations ---
      const totalRevenue = paidJobsData?.reduce((acc, job) => acc + (job.total_price || 0), 0) || 0
      const businessShare = totalRevenue * 0.60

      const totalExpenses = expensesData?.reduce((acc, expense) => acc + (expense.amount || 0), 0) || 0

      setFinancialStats({
        runningBalance: businessShare - totalExpenses,
        businessShare: businessShare,
        totalExpenses: totalExpenses,
        paidJobsCount: paidJobsData?.length || 0,
      })

      // --- Chart Data Processing ---
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {}

      // Process revenue from paid jobs
      paidJobsData?.forEach(job => {
        if (job.scheduled_date) { // Using scheduled_date as the transaction date for paid jobs
          const date = new Date(job.scheduled_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0 }
          monthlyData[monthKey].revenue += (job.total_price || 0) * 0.60
        }
      })

      // Process expenses
      expensesData?.forEach(expense => {
        const date = new Date(expense.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0 }
        monthlyData[monthKey].expenses += expense.amount || 0
      })

      const formattedChartData = Object.keys(monthlyData)
        .sort() // Sort keys chronologically (e.g., '2023-12', '2024-01')
        .map(key => {
          const [year, month] = key.split('-')
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' })
          return {
            name: `${monthName} '${year.slice(2)}`,
            revenue: monthlyData[key].revenue,
            expenses: monthlyData[key].expenses,
          }
        })

      const totalsForChart = formattedChartData.reduce((acc, month) => {
        acc.revenue += month.revenue
        acc.expenses += month.expenses
        return acc
      }, { revenue: 0, expenses: 0 })

      setChartTotals(totalsForChart)
      setChartData(formattedChartData)

      // The type from Supabase can be an array for related tables, so we cast it.
      // We know from our schema it will be a single object.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Running Balance</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900">${financialStats.runningBalance.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Awaiting Sending</h3>
          <p className="mt-1 text-3xl font-semibold text-blue-600">${pendingPayout.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">New Quotes</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.newQuotes}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 md:gap-8">
        {/* Recent Quotes Column */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
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

        {/* Second Row: Upcoming Jobs and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Upcoming Jobs Column */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
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

          {/* Pending Payout Jobs Column */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Pending Payout Jobs</h3>
              <Link href="/jobs?status=completed" className="text-sm font-medium text-primary-600 hover:text-primary-800">View All</Link>
            </div>
            <div className="border-t border-gray-200">
              {pendingJobs.length === 0 ? (
                <p className="text-center text-gray-500 p-6">No jobs are awaiting payment.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {pendingJobs.map((job) => (
                    <li key={job.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {/* Handle both single object and array from Supabase type */}
                          {job.clients && !Array.isArray(job.clients)
                            ? job.clients.full_name
                            : Array.isArray(job.clients) && job.clients.length > 0
                              ? job.clients[0].full_name : 'Unknown Client'}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          ${(job.total_price * 0.60).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">Awaiting payment</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          {/* Chart */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Performance</h3>
              <div className="flex items-center gap-4 text-sm mt-2 sm:mt-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">Total Share: <span className="font-bold text-gray-800">${chartTotals.revenue.toFixed(2)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span>
                  <span className="text-gray-600">Total Expenses: <span className="font-bold text-gray-800">${chartTotals.expenses.toFixed(2)}</span></span>
                </div>
              </div>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} name="Business Share" />
                  <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
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
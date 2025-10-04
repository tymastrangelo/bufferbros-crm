// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type JobWithDetails, type JobStatus } from '@/lib/types'

type StatusCounts = {
  [key in JobStatus]?: number
}

const statusOrder: JobStatus[] = ['new', 'quoted', 'scheduled', 'in_progress', 'completed', 'paid', 'cancelled']

export default function DashboardPage() {
  const router = useRouter()
  const [todaysJobs, setTodaysJobs] = useState<JobWithDetails[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSessionAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      // Get today's date range
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      today.setHours(23, 59, 59, 999)
      const todayEnd = today.toISOString()

      const [todaysJobsRes, allJobsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*, clients(full_name), vehicles(make, model)')
          .gte('scheduled_date', todayStart)
          .lte('scheduled_date', todayEnd)
          .order('scheduled_date', { ascending: true }),
        supabase
          .from('jobs')
          .select('status')
      ])

      if (todaysJobsRes.error || allJobsRes.error) {
        setError('Failed to load dashboard data.')
      } else {
        if (todaysJobsRes.data) {
          setTodaysJobs(todaysJobsRes.data as JobWithDetails[])
        }
        if (allJobsRes.data) {
          const counts = allJobsRes.data.reduce((acc: StatusCounts, job) => {
            const status = job.status as JobStatus;
            acc[status] = (acc[status] || 0) + 1;
            return acc
          }, {} as StatusCounts)
          setStatusCounts(counts)
        }
      }
      setLoading(false)
    }

    checkSessionAndFetchData()
  }, [router])

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-4">
          <Link href="/jobs/new" className="px-4 py-2 font-semibold text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800">
            + New Job
          </Link>
          <Link href="/clients/new" className="px-4 py-2 font-semibold text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800">
            + New Client
          </Link>
        </div>
      </div>

      {/* Status Counts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Job Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {statusOrder.map(status => (
            <div key={status} className="bg-white border border-gray-200 p-4 rounded-xl text-center">
              <p className="text-3xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
              <p className="text-sm font-medium text-gray-500 capitalize">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Jobs */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Jobs</h2>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <ul className="divide-y divide-gray-200">
            {todaysJobs.length > 0 ? (
              todaysJobs.map(job => (
                <li key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{job.clients?.full_name}</p>
                      <p className="text-sm text-gray-500">
                        {job.vehicles ? `${job.vehicles.make} ${job.vehicles.model}` : 'No vehicle'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <p className="text-sm font-medium text-gray-600">
                        {job.scheduled_date ? new Date(job.scheduled_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time TBD'}
                      </p>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                        {job.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="p-6 text-center text-gray-500">
                No jobs scheduled for today.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
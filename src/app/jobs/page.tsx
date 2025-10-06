// src/app/jobs/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type JobWithDetails } from '@/lib/types'

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('scheduled_date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [jobsPerPage, setJobsPerPage] = useState(10)
  const [totalJobs, setTotalJobs] = useState(0)

  const jobStatuses = ['new', 'quoted', 'scheduled', 'in_progress', 'completed', 'paid', 'cancelled']

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const from = (currentPage - 1) * jobsPerPage
      const to = from + jobsPerPage - 1

      let query = supabase
        .from('jobs')
        .select('*, clients!inner(full_name), vehicles(make, model), services(name)', { count: 'exact' })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (searchTerm) {
        query = query.ilike('clients.full_name', `%${searchTerm}%`)
      }

      const [sortField, sortOrder] = sortBy.split('-')
      if (sortField === 'client_name') {
        query = query.order('full_name', { referencedTable: 'clients', ascending: sortOrder === 'asc' })
      } else {
        query = query.order(sortField, { ascending: sortOrder === 'asc', nullsFirst: false })
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setJobs(data as JobWithDetails[])
      setTotalJobs(count || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, jobsPerPage, statusFilter, searchTerm, sortBy])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm, jobsPerPage])

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading jobs...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  const totalPages = Math.ceil(totalJobs / jobsPerPage)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Jobs</h1>
        <Link
          href="/jobs/new"
          className="px-4 py-2 font-semibold text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          New Job
        </Link>
      </div>

      {/* Filters and Controls */}
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            {jobStatuses.map(status => (
              <option key={status} value={status} className="capitalize">{status.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="scheduled_date-desc">Scheduled Date (Newest)</option>
            <option value="scheduled_date-asc">Scheduled Date (Oldest)</option>
            <option value="client_name-asc">Client Name (A-Z)</option>
            <option value="client_name-desc">Client Name (Z-A)</option>
          </select>
          <select
            value={jobsPerPage}
            onChange={(e) => setJobsPerPage(Number(e.target.value))}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading && <div className="absolute inset-x-0 top-0 h-1 bg-primary-200 animate-pulse rounded-t-2xl"></div>}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.clients?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.vehicles ? `${job.vehicles.make} ${job.vehicles.model}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.services?.name || 'Custom'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not Scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize
                        ${job.status === 'paid' && 'bg-green-100 text-green-800'}
                        ${job.status === 'completed' && 'bg-blue-100 text-blue-800'}
                        ${job.status === 'scheduled' && 'bg-purple-100 text-purple-800'}
                        ${job.status === 'in_progress' && 'bg-yellow-100 text-yellow-800'}
                        ${job.status === 'cancelled' && 'bg-red-100 text-red-800'}
                        ${!['paid', 'completed', 'scheduled', 'in_progress', 'cancelled'].includes(job.status) && 'bg-gray-100 text-gray-800'}
                      `}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/jobs/${job.id}`} className="text-primary-700 hover:text-primary-900 font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Fetching jobs...' : 'No jobs match your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing <span className="font-semibold">{Math.min(1 + (currentPage - 1) * jobsPerPage, totalJobs)}</span> to <span className="font-semibold">{Math.min(currentPage * jobsPerPage, totalJobs)}</span> of <span className="font-semibold">{totalJobs}</span> results
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
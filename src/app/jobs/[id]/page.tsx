// src/app/jobs/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Job, type Client, type Vehicle, type Service, type Addon, type JobStatus } from '@/lib/types'
import Modal from '@/components/Modal'
import EditJobForm from '@/components/EditJobForm'

type JobWithAllDetails = Job & {
  clients: Client | null
  vehicles: Vehicle | null
  services: Service | null
  job_addons: { addons: Addon }[]
}

const jobStatuses: JobStatus[] = ['new', 'quoted', 'scheduled', 'in_progress', 'completed', 'paid', 'cancelled']

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id

  const [job, setJob] = useState<JobWithAllDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setEditModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!jobId) return

    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(*), vehicles(*), services(*), job_addons(addons(*))')
      .eq('id', jobId)
      .single()

    if (error) {
      setError(error.message)
    } else {
      setJob(data)
    }
    setLoading(false)
  }, [jobId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return

    // Optimistically update the UI
    const oldStatus = job.status
    setJob({ ...job, status: newStatus })

    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', job.id)

    if (error) {
      // Revert on error
      setJob({ ...job, status: oldStatus })
      setError(`Failed to update status: ${error.message}`)
    }
  }

  const handleJobUpdated = (updatedJobData: JobWithAllDetails) => {
    setJob(updatedJobData)
    setEditModalOpen(false)
  }
  
  const handleDeleteJob = async () => {
    if (!job) return;

    if (window.confirm(`Are you sure you want to delete Job #${job.id}? This will also delete associated invoices and cannot be undone.`)) {
      setLoading(true);
      setError(null);

      // Because of foreign key constraints, we must delete dependent records first.
      // 1. Delete from job_addons
      const { error: addonError } = await supabase.from('job_addons').delete().eq('job_id', job.id);
      if (addonError) {
        setError(`Failed to delete job addons: ${addonError.message}`);
        setLoading(false);
        return;
      }

      // 2. Delete from invoices (assuming invoices are linked to jobs)
      // If you don't have invoices linked, you can remove this part.
      const { error: invoiceError } = await supabase.from('invoices').delete().eq('job_id', job.id);
      if (invoiceError) {
        setError(`Failed to delete associated invoices: ${invoiceError.message}`);
        setLoading(false);
        return;
      }

      // 3. Delete the job itself
      const { error: jobError } = await supabase.from('jobs').delete().eq('id', job.id);
      if (jobError) {
        setError(`Failed to delete job: ${jobError.message}`);
        setLoading(false);
      } else {
        router.push('/jobs');
      }
    }
  };

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading job details...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  if (!job) {
    return <div className="text-center p-6 text-gray-400">Job not found.</div>
  }

  const servicePrice = job.services?.base_price ?? 0
  const addons = job.job_addons.map(ja => ja.addons)
  const addonsPrice = addons.reduce((sum, addon) => sum + (addon?.price ?? 0), 0)
  const calculatedTotal = servicePrice + addonsPrice

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/jobs" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline mb-2 block">
            &larr; Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Job #{job.id}</h1>
          <p className="text-gray-500">
            {job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not Scheduled'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
            className="rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            {jobStatuses.map(status => (
              <option key={status} value={status} className="capitalize">{status.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={() => setEditModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-primary-700 bg-white border-2 border-primary-700 rounded-lg hover:bg-primary-50 transition-colors">Edit Job</button>
          <button onClick={handleDeleteJob} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700">Delete Job</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service & Add-ons</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-800 font-medium">
                <span>{job.services?.name ?? 'Service not specified'}</span>
                <span>${servicePrice.toFixed(2)}</span>
              </div>
              {addons.map(addon => addon && (
                <div key={addon.id} className="flex justify-between text-gray-500 pl-4">
                  <span>+ {addon.name}</span>
                  <span>${addon.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between text-lg font-bold text-gray-900">
              <span>Estimated Total</span>
              <span>${(job.total_price ?? calculatedTotal).toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes || 'No notes for this job.'}</p>
          </div>
        </div>

        {/* Right Column: Associated Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client</h3>
            {job.clients ? (
              <Link href={`/clients/${job.clients.id}`} className="group">
                <p className="font-medium text-gray-800 group-hover:text-primary-700 group-hover:underline">{job.clients.full_name}</p>
                <p className="text-sm text-gray-500">{job.clients.email}</p>
                <p className="text-sm text-gray-500">{job.clients.phone}</p>
              </Link>
            ) : <p className="text-sm text-gray-500">No client associated.</p>}
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle</h3>
            {job.vehicles ? (
              <Link href={`/vehicles/${job.vehicles.id}`} className="group">
                <p className="font-medium text-gray-800 group-hover:text-primary-700 group-hover:underline">{job.vehicles.year} {job.vehicles.make} {job.vehicles.model}</p>
                <p className="text-sm text-gray-500">{job.vehicles.color} &bull; {job.vehicles.license_plate}</p>
              </Link>
            ) : <p className="text-sm text-gray-500">No vehicle associated.</p>}
          </div>
        </div>
      </div>

      {/* Edit Job Modal */}
      {job && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Job #${job.id}`}>
          <EditJobForm job={job} onSuccess={handleJobUpdated} onCancel={() => setEditModalOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
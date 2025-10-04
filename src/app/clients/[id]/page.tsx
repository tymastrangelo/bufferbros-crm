// src/app/clients/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Client, type Vehicle, type Job } from '@/lib/types'
import Modal from '@/components/Modal'
import AddVehicleForm from '@/components/AddVehicleForm'
import EditClientForm from '@/components/EditClientForm'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id

  const [client, setClient] = useState<Client | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddVehicleModalOpen, setAddVehicleModalOpen] = useState(false)
  const [isEditModalOpen, setEditModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!clientId) return

    setLoading(true)

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }

    // Fetch client, vehicles, and jobs in parallel
    const [clientRes, vehiclesRes, jobsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('vehicles').select('*').eq('client_id', clientId),
      supabase.from('jobs').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    ])

    if (clientRes.error) {
      setError(clientRes.error.message)
    } else {
      setClient(clientRes.data)
    }

    if (vehiclesRes.data) setVehicles(vehiclesRes.data)
    if (jobsRes.data) setJobs(jobsRes.data)

    setLoading(false)
  }, [clientId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeleteClient = async () => {
    if (!client) return
    if (window.confirm(`Are you sure you want to delete ${client.full_name}? This action cannot be undone.`)) {
      const { error } = await supabase.from('clients').delete().eq('id', client.id)
      if (error) {
        setError(error.message)
      } else {
        router.push('/clients')
      }
    }
  }

  const handleVehicleAdded = (newVehicle: Vehicle) => {
    setVehicles(currentVehicles => [newVehicle, ...currentVehicles])
    setAddVehicleModalOpen(false)
  }

  const handleClientUpdated = (updatedClient: Client) => {
    setClient(updatedClient)
    setEditModalOpen(false)
  }

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading client details...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  if (!client) {
    return <div className="text-center p-6 text-gray-400">Client not found.</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/clients" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline mb-2 block">
            &larr; Back to Clients
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
          <p className="text-gray-500">{client.email} &bull; {client.phone}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-primary-700 bg-white border-2 border-primary-700 rounded-lg hover:bg-primary-50 transition-colors">Edit Client</button>
          <button onClick={handleDeleteClient} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700">Delete Client</button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-gray-700 text-right">{client.address || 'N/A'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Contact Method</dt><dd className="text-gray-700 text-right">{client.preferred_contact_method || 'N/A'}</dd></div>
            </dl>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes || 'No notes for this client.'}</p>
          </div>
        </div>

        {/* Right Column: Vehicles and Jobs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles Card */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
              <button onClick={() => setAddVehicleModalOpen(true)} className="px-3 py-1 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800">Add Vehicle</button>
            </div>
            <ul className="divide-y divide-gray-200">
              {vehicles.length > 0 ? vehicles.map(v => (
                <li key={v.id} className="py-3">
                  <p className="font-medium text-gray-800">{v.year} {v.make} {v.model}</p>
                  <p className="text-sm text-gray-500">{v.color} &bull; {v.license_plate || 'No Plate'}</p>
                </li>
              )) : <p className="text-sm text-gray-500">No vehicles on file.</p>}
            </ul>
          </div>

          {/* Jobs Card */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Job History</h3>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800">Create Job</button>
            </div>
            <ul className="divide-y divide-gray-200">
              {jobs.length > 0 ? jobs.map(j => (
                <li key={j.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">Job #{j.id}</p>
                    <p className="text-sm text-gray-500">
                      {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : 'Not Scheduled'}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">{j.status}</span>
                </li>
              )) : <p className="text-sm text-gray-500">No job history.</p>}
            </ul>
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isAddVehicleModalOpen}
        onClose={() => setAddVehicleModalOpen(false)}
        title={`Add Vehicle for ${client.full_name}`}
      >
        <AddVehicleForm clientId={client.id} onSuccess={handleVehicleAdded} onCancel={() => setAddVehicleModalOpen(false)} />
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit ${client.full_name}`}
      >
        <EditClientForm client={client} onSuccess={handleClientUpdated} onCancel={() => setEditModalOpen(false)} />
      </Modal>
    </div>
  )
}
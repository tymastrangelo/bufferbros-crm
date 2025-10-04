// src/app/vehicles/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Vehicle } from '@/lib/types'
import Modal from '@/components/Modal'
import EditVehicleForm from '@/components/EditVehicleForm'

type VehicleWithClient = Vehicle & {
  clients: { id: number; full_name: string } | null
}

export default function VehicleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = params.id

  const [vehicle, setVehicle] = useState<VehicleWithClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setEditModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!vehicleId) return

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*, clients(id, full_name)')
      .eq('id', vehicleId)
      .single()

    if (error) {
      setError(error.message)
    } else {
      setVehicle(data)
    }

    setLoading(false)
  }, [vehicleId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicle(prev => prev ? { ...prev, ...updatedVehicle } : null)
    setEditModalOpen(false)
  }

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading vehicle details...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  if (!vehicle) {
    return <div className="text-center p-6 text-gray-400">Vehicle not found.</div>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/vehicles" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline mb-2 block">
            &larr; Back to Vehicles
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-primary-700 bg-white border-2 border-primary-700 rounded-lg hover:bg-primary-50 transition-colors">Edit Vehicle</button>
          <button className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700">Delete Vehicle</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">Make</dt><dd className="font-medium text-gray-800">{vehicle.make || 'N/A'}</dd></div>
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">Model</dt><dd className="font-medium text-gray-800">{vehicle.model || 'N/A'}</dd></div>
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">Year</dt><dd className="font-medium text-gray-800">{vehicle.year || 'N/A'}</dd></div>
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">Color</dt><dd className="font-medium text-gray-800">{vehicle.color || 'N/A'}</dd></div>
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">License Plate</dt><dd className="font-medium text-gray-800">{vehicle.license_plate || 'N/A'}</dd></div>
              <div className="flex justify-between border-b border-gray-200 py-2"><dt className="text-gray-500">Type</dt><dd className="font-medium text-gray-800">{vehicle.type || 'N/A'}</dd></div>
            </dl>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{vehicle.notes || 'No notes for this vehicle.'}</p>
          </div>
        </div>

        {/* Right Column: Associated Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner</h3>
            {vehicle.clients ? (
              <Link href={`/clients/${vehicle.clients.id}`} className="hover:text-primary-700 group">
                <p className="font-medium text-gray-800 group-hover:underline">{vehicle.clients.full_name}</p>
                <p className="text-sm text-gray-500">View Client Details &rarr;</p>
              </Link>
            ) : <p className="text-sm text-gray-500">No client associated.</p>}
          </div>
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      >
        <EditVehicleForm vehicle={vehicle} onSuccess={handleVehicleUpdated} onCancel={() => setEditModalOpen(false)} />
      </Modal>
    </div>
  )
}
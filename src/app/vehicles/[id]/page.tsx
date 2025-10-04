// src/app/vehicles/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Vehicle } from '@/lib/types'

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
          <h1 className="text-3xl font-bold text-gray-100">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
          {vehicle.clients && (
            <Link href={`/clients/${vehicle.clients.id}`} className="text-gray-400 hover:text-primary-700 transition-colors">
              Owned by: {vehicle.clients.full_name}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-semibold text-gray-200 bg-gray-700 rounded-lg hover:bg-gray-600">Edit Vehicle</button>
          <button className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Delete Vehicle</button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Vehicle Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="flex justify-between border-b border-gray-800 py-2"><dt className="text-gray-400">Color</dt><dd className="text-gray-200">{vehicle.color || 'N/A'}</dd></div>
          <div className="flex justify-between border-b border-gray-800 py-2"><dt className="text-gray-400">License Plate</dt><dd className="text-gray-200">{vehicle.license_plate || 'N/A'}</dd></div>
          <div className="flex justify-between border-b border-gray-800 py-2"><dt className="text-gray-400">Type</dt><dd className="text-gray-200">{vehicle.type || 'N/A'}</dd></div>
          <div className="flex justify-between border-b border-gray-800 py-2"><dt className="text-gray-400">Client ID</dt><dd className="text-gray-200">{vehicle.client_id}</dd></div>
        </dl>
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-300 mb-2">Notes</h4>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{vehicle.notes || 'No notes for this vehicle.'}</p>
        </div>
      </div>
    </div>
  )
}
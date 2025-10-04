// src/app/vehicles/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Client } from '@/lib/types'

export default function NewVehiclePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select('*').order('full_name')
      if (data) {
        setClients(data)
      } else if (error) {
        setError('Could not fetch clients.')
      }
    }
    fetchClients()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedClientId) {
      setError('Please select a client.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase
      .from('vehicles')
      .insert({
        client_id: parseInt(selectedClientId),
        make,
        model,
        year: year || null,
        color: color || null,
        license_plate: licensePlate || null,
        notes: notes || null,
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
    } else {
      router.push('/vehicles')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Add New Vehicle</h1>
        <Link href="/vehicles" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline">
          &larr; Back to Vehicles List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-sm space-y-6">
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-300">Client <span className="text-red-500">*</span></label>
          <select
            id="client"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="" disabled>Select a client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.full_name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="make" className="block text-sm font-medium text-gray-300">Make</label>
            <input id="make" type="text" value={make} onChange={(e) => setMake(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-300">Model</label>
            <input id="model" type="text" value={model} onChange={(e) => setModel(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-300">Year</label>
            <input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value))} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-300">Color</label>
            <input id="color" type="text" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
          </div>
        </div>

        <div>
          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-300">License Plate</label>
          <input id="licensePlate" type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end space-x-4 pt-4">
          <Link href="/vehicles" className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
            {submitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </div>
  )
}
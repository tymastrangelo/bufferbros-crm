'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Vehicle } from '@/lib/types'

interface AddVehicleFormProps {
  clientId: number
  onSuccess: (newVehicle: Vehicle) => void
  onCancel: () => void
}

export default function AddVehicleForm({ clientId, onSuccess, onCancel }: AddVehicleFormProps) {
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        client_id: clientId,
        make,
        model,
        year: year || null,
        color: color || null,
        license_plate: licensePlate || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      onSuccess(data)
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-300">Make</label>
          <input id="make" type="text" value={make} onChange={(e) => setMake(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-300">Model</label>
          <input id="model" type="text" value={model} onChange={(e) => setModel(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-600 bg-gray-800 px-4 py-3 text-gray-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="flex justify-end space-x-4 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
          {submitting ? 'Saving...' : 'Save Vehicle'}
        </button>
      </div>
    </form>
  )
}
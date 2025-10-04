'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Vehicle } from '@/lib/types'

interface EditVehicleFormProps {
  vehicle: Vehicle
  onSuccess: (updatedVehicle: Vehicle) => void
  onCancel: () => void
}

export default function EditVehicleForm({ vehicle, onSuccess, onCancel }: EditVehicleFormProps) {
  const [make, setMake] = useState(vehicle.make || '')
  const [model, setModel] = useState(vehicle.model || '')
  const [year, setYear] = useState<number | ''>(vehicle.year || '')
  const [color, setColor] = useState(vehicle.color || '')
  const [licensePlate, setLicensePlate] = useState(vehicle.license_plate || '')
  const [notes, setNotes] = useState(vehicle.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        make,
        model,
        year: year || null,
        color: color || null,
        license_plate: licensePlate || null,
        notes: notes || null,
      })
      .eq('id', vehicle.id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else if (data) {
      onSuccess(data)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-make" className="block text-sm font-medium text-gray-700">Make</label>
          <input id="edit-make" type="text" value={make} onChange={(e) => setMake(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label htmlFor="edit-model" className="block text-sm font-medium text-gray-700">Model</label>
          <input id="edit-model" type="text" value={model} onChange={(e) => setModel(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-year" className="block text-sm font-medium text-gray-700">Year</label>
          <input id="edit-year" type="number" value={year} onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value))} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label htmlFor="edit-color" className="block text-sm font-medium text-gray-700">Color</label>
          <input id="edit-color" type="text" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>
      <div>
        <label htmlFor="edit-licensePlate" className="block text-sm font-medium text-gray-700">License Plate</label>
        <input id="edit-licensePlate" type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
      </div>
      <div>
        <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea id="edit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end space-x-4 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
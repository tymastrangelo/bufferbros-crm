'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Client, type Vehicle, type Service, type Addon, type Job } from '@/lib/types'

type JobWithAllDetails = Job & {
  clients: Client | null
  vehicles: Vehicle | null
  services: Service | null
  job_addons: { addons: Addon }[]
}

interface EditJobFormProps {
  job: JobWithAllDetails
  onSuccess: (updatedJobData: JobWithAllDetails) => void
  onCancel: () => void
}

export default function EditJobForm({ job, onSuccess, onCancel }: EditJobFormProps) {
  // Data states for dropdowns
  const [clients, setClients] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [addons, setAddons] = useState<Addon[]>([])

  // Form input states, initialized from the job prop
  const [selectedClientId, setSelectedClientId] = useState<string>(job.client_id?.toString() || '')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(job.vehicle_id?.toString() || '')
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    job.service_id?.toString() || 'custom-service'
  )
  const [customPrice, setCustomPrice] = useState<string>(
    job.service_id ? '' : job.total_price?.toString() || ''
  )
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(
    new Set(job.job_addons.map(ja => ja.addons.id))
  )
  const [scheduledDate, setScheduledDate] = useState(
    job.scheduled_date ? new Date(job.scheduled_date).toISOString().slice(0, 16) : ''
  )
  const [notes, setNotes] = useState(job.notes || '')
  const [employeePercent, setEmployeePercent] = useState<string>(
    job.employee_percent?.toString() || '40'
  )

  // UI states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data for forms
  useEffect(() => {
    const fetchInitialData = async () => {
      const [clientsRes, servicesRes, addonsRes] = await Promise.all([
        supabase.from('clients').select('*').order('full_name'),
        supabase.from('services').select('*').order('name'),
        supabase.from('addons').select('*').order('name'),
      ])

      if (clientsRes.data) setClients(clientsRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (addonsRes.data) setAddons(addonsRes.data)

      setLoading(false)
    }
    fetchInitialData()
  }, [])

  // Fetch vehicles when a client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setVehicles([])
      return
    }

    const fetchVehicles = async () => {
      const { data } = await supabase.from('vehicles').select('*').eq('client_id', selectedClientId)
      if (data) setVehicles(data)
    }
    fetchVehicles()
  }, [selectedClientId])

  const handleAddonToggle = (addonId: number) => {
    const newSelection = new Set(selectedAddonIds)
    if (newSelection.has(addonId)) {
      newSelection.delete(addonId)
    } else {
      newSelection.add(addonId)
    }
    setSelectedAddonIds(newSelection)
  }

  const totalPrice = useMemo(() => {
    let servicePrice = 0
    if (selectedServiceId === 'custom-service') {
      servicePrice = parseFloat(customPrice) || 0
    } else {
      servicePrice = services.find(s => s.id === parseInt(selectedServiceId))?.base_price || 0
    }
    const addonsPrice = addons
      .filter(a => selectedAddonIds.has(a.id))
      .reduce((sum, a) => sum + a.price, 0)
    return servicePrice + addonsPrice
  }, [selectedServiceId, customPrice, selectedAddonIds, services, addons])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // 1. Update the main job details
    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update({
        client_id: parseInt(selectedClientId),
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId) : null,
        service_id: selectedServiceId === 'custom-service' ? null : parseInt(selectedServiceId),
        scheduled_date: scheduledDate || null,
        notes,
        total_price: totalPrice,
        employee_percent: parseFloat(employeePercent) || 40,
      })
      .eq('id', job.id)

    if (jobUpdateError) {
      setError(`Error updating job: ${jobUpdateError.message}`)
      setSubmitting(false)
      return
    }

    // 2. Sync addons: delete old, insert new
    const { error: deleteAddonsError } = await supabase.from('job_addons').delete().eq('job_id', job.id)
    if (deleteAddonsError) {
      setError(`Error clearing old addons: ${deleteAddonsError.message}`)
      // Continue, as the main job was updated
    }

    if (selectedAddonIds.size > 0) {
      const newJobAddons = Array.from(selectedAddonIds).map(addonId => ({
        job_id: job.id,
        addon_id: addonId,
      }))
      const { error: insertAddonsError } = await supabase.from('job_addons').insert(newJobAddons)
      if (insertAddonsError) {
        setError(`Job updated, but failed to link new addons: ${insertAddonsError.message}`)
        // Continue, as the main job was updated
      }
    }

    // 3. Fetch the fully updated job data to pass back
    const { data: updatedJobData, error: fetchError } = await supabase
      .from('jobs')
      .select('*, clients(*), vehicles(*), services(*), job_addons(addons(*))')
      .eq('id', job.id)
      .single()

    if (fetchError) {
      setError('Could not refetch updated job data.')
    } else if (updatedJobData) {
      onSuccess(updatedJobData)
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading form data...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client and Vehicle Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-client" className="block text-sm font-medium text-gray-700">Client</label>
          <select id="edit-client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-vehicle" className="block text-sm font-medium text-gray-700">Vehicle</label>
          <select id="edit-vehicle" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} disabled={!selectedClientId || vehicles.length === 0} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50">
            <option value="">Select a vehicle (optional)</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
          </select>
        </div>
      </div>

      {/* Service and Addons */}
      <div>
        <label htmlFor="edit-service" className="block text-sm font-medium text-gray-700">Service</label>
        <select
          id="edit-service"
          value={selectedServiceId}
          onChange={(e) => {
            setSelectedServiceId(e.target.value)
            if (e.target.value !== 'custom-service') {
              setCustomPrice('')
            }
          }}
          required
          className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${s.base_price}</option>)}
          <option value="custom-service">Custom...</option>
        </select>
      </div>

      {selectedServiceId === 'custom-service' && (
        <div>
          <label htmlFor="edit-customPrice" className="block text-sm font-medium text-gray-700">
            Custom Service Price ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="edit-customPrice"
            name="customPrice"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            required
            step="0.01"
            placeholder="Enter total service price"
            className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Add-ons</label>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          {addons.map(addon => (
            <label key={addon.id} className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" checked={selectedAddonIds.has(addon.id)} onChange={() => handleAddonToggle(addon.id)} className="h-5 w-5 rounded border-gray-300 bg-white text-primary-600 focus:ring-primary-500" />
              <span className="text-gray-700">{addon.name} (+${addon.price})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Scheduling and Notes */}
      <div>
        <label htmlFor="edit-scheduledDate" className="block text-sm font-medium text-gray-700">Scheduled Date & Time</label>
        <input id="edit-scheduledDate" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
      </div>

        <div>
          <label htmlFor="edit-employeePercent" className="block text-sm font-medium text-gray-700">
            Employee Percentage (%)
          </label>
          <input
            id="edit-employeePercent"
            type="number"
            value={employeePercent}
            onChange={(e) => setEmployeePercent(e.target.value)}
            min="0"
            max="100"
            step="1"
            className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            Percentage of total price paid to employee (default: 40%, company gets 60%)
          </p>
        </div>      <div>
        <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Job Notes</label>
        <textarea id="edit-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
      </div>

      {/* Total and Submission */}
      <div className="border-t border-gray-200 pt-4 mt-4 bg-white">
        <div className="flex justify-between items-center text-lg mb-3">
          <span className="font-semibold text-gray-600">Estimated Total:</span>
          <span className="font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
        </div>
        {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-bold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
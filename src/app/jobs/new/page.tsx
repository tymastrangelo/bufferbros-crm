// src/app/jobs/new/page.tsx
'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Client, type Vehicle, type Service, type Addon } from '@/lib/types'

export default function NewJobPage() {
  const router = useRouter()

  // Data states for dropdowns
  const [clients, setClients] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [addons, setAddons] = useState<Addon[]>([])

  // Form input states
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set())
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')

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

      if (clientsRes.error || servicesRes.error || addonsRes.error) {
        setError('Failed to load required data.')
      }
      setLoading(false)
    }
    fetchInitialData()
  }, [])

  // Fetch vehicles when a client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setVehicles([])
      setSelectedVehicleId('')
      return
    }

    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', selectedClientId)
      if (data) {
        setVehicles(data)
      }
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

  const triggerWebhook = async (jobData: any) => {
    try {
      // Call our internal API route instead of the external webhook directly
      await fetch('/api/jobs/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
    } catch (error) {
      // The API route will handle its own errors. We can log this for client-side debugging if needed.
      console.error('Failed to trigger webhook:', error);
    }
  };

  const totalPrice = useMemo(() => {
    const servicePrice = services.find(s => s.id === parseInt(selectedServiceId))?.base_price || 0
    const addonsPrice = addons
      .filter(a => selectedAddonIds.has(a.id))
      .reduce((sum, a) => sum + a.price, 0)
    return servicePrice + addonsPrice
  }, [selectedServiceId, selectedAddonIds, services, addons])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedClientId || !selectedServiceId) {
      setError('Client and Service are required.')
      return
    }
    setSubmitting(true)
    setError(null)

    // 1. Create the job
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        client_id: parseInt(selectedClientId),
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId) : null,
        service_id: parseInt(selectedServiceId),
        scheduled_date: scheduledDate || null,
        notes,
        total_price: totalPrice,
        status: 'new',
      })
      .select()
      .single()

    if (jobError) {
      setError(jobError.message)
      setSubmitting(false)
      return
    }

    // 2. Link addons if any were selected
    if (selectedAddonIds.size > 0) {
      const jobAddons = Array.from(selectedAddonIds).map(addonId => ({
        job_id: newJob.id,
        addon_id: addonId,
      }))
      const { error: addonError } = await supabase.from('job_addons').insert(jobAddons)
      if (addonError) {
        // Handle addon link error (e.g., log it, show a partial success message)
        setError(`Job created, but failed to link addons: ${addonError.message}`)
        setSubmitting(false)
        // Still redirect, as the main job was created
        router.push(`/jobs/${newJob.id}`)
        return
      }
    }

    // 3. Trigger the webhook with all job details
    const client = clients.find(c => c.id === newJob.client_id);
    const vehicle = vehicles.find(v => v.id === newJob.vehicle_id);
    const service = services.find(s => s.id === newJob.service_id);
    const selectedAddons = addons.filter(a => selectedAddonIds.has(a.id));

    await triggerWebhook({
      job: newJob,
      client,
      vehicle,
      service,
      addons: selectedAddons,
    });

    router.push(`/jobs/${newJob.id}`)
  }

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading form data...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create New Job</h1>
        <Link href="/jobs" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline">
          &larr; Back to Jobs List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
        {/* Client and Vehicle Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700">Client <span className="text-red-500">*</span></label>
            <select id="client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
              <option value="" disabled>Select a client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700">Vehicle</label>
            <select id="vehicle" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} disabled={!selectedClientId || vehicles.length === 0} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50">
              <option value="">Select a vehicle (optional)</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </select>
          </div>
        </div>

        {/* Service and Addons */}
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-gray-700">Service <span className="text-red-500">*</span></label>
          <select id="service" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
            <option value="" disabled>Select a service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${s.base_price}</option>)}
          </select>
        </div>

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
          <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">Scheduled Date & Time</label>
          <input id="scheduledDate" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Job Notes</label>
          <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>

        {/* Total and Submission */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-600">Estimated Total:</span>
            <span className="font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div className="flex justify-end space-x-4">
            <Link href="/jobs" className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</Link>
            <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-bold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
              {submitting ? 'Creating Job...' : 'Create Job'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
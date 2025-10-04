'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Client } from '@/lib/types'

interface EditClientFormProps {
  client: Client
  onSuccess: (updatedClient: Client) => void
  onCancel: () => void
}

export default function EditClientForm({ client, onSuccess, onCancel }: EditClientFormProps) {
  const [fullName, setFullName] = useState(client.full_name)
  const [phone, setPhone] = useState(client.phone || '')
  const [email, setEmail] = useState(client.email || '')
  const [address, setAddress] = useState(client.address || '')
  const [notes, setNotes] = useState(client.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase
      .from('clients')
      .update({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      })
      .eq('id', client.id)
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
      <div>
        <label htmlFor="edit-fullName" className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
        <input id="edit-fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone</label>
          <input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
          <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>
      <div>
        <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700">Address</label>
        <input id="edit-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
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
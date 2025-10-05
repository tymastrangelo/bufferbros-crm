'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Client } from '@/lib/types'

interface QuoteVehicle {
  year: string;
  make: string;
  model: string;
}
interface QuoteSubmission {
  id: number;
  created_at: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicles: QuoteVehicle[] | null; // JSONB from quote form
  preferred_package: string | null;
  add_ons: string[] | null;
  service_address: string | null;
  special_requests: string | null;
  status: string;
  client_id: number | null;
}

type QuoteWithClient = QuoteSubmission & { clients: Client | null }

export default function QuoteDetailPage() {
  const params = useParams()
  const quoteId = params.id

  const [quote, setQuote] = useState<QuoteWithClient | null>(null)
  const [matchingClients, setMatchingClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  const fetchData = useCallback(async () => {
    if (!quoteId) return

    setLoading(true)
    setError(null)

    // Fetch quote submission and any linked client
    const { data: quoteData, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('*, clients(*)')
      .eq('id', quoteId)
      .single()

    if (quoteError) {
      setError(quoteError.message)
      setLoading(false)
      return
    }
    setQuote(quoteData)

    // If not linked, search for potential matching clients by email or phone
    if (!quoteData.client_id) {
      const searchFilter = [
        quoteData.email ? `email.eq.${quoteData.email}` : null,
        quoteData.phone ? `phone.eq.${quoteData.phone}` : null,
      ].filter(Boolean).join(',')

      if (searchFilter) {
        const { data: matchingData } = await supabase
          .from('clients')
          .select('*')
          .or(searchFilter)
        setMatchingClients(matchingData || [])
      }
    }

    setLoading(false)
  }, [quoteId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLinkClient = async (clientId: number) => {
    if (!quote) return
    setActionInProgress(true)
    const { data, error } = await supabase
      .from('quote_submissions')
      .update({ client_id: clientId, status: 'contacted' })
      .eq('id', quote.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      setQuote(data)
      setMatchingClients([])
    }
    setActionInProgress(false)
  }

  const handleCreateClient = async () => {
    if (!quote) return
    setActionInProgress(true)

    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        full_name: quote.full_name,
        email: quote.email,
        phone: quote.phone,
        address: quote.service_address,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setActionInProgress(false)
      return
    }

    if (newClient) {
      await handleLinkClient(newClient.id) // This will set actionInProgress to false
    } else {
      setActionInProgress(false)
    }
  }

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading quote...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  if (!quote) {
    return <div className="text-center p-6 text-gray-400">Quote not found.</div>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Quote Submission #{quote.id}</h1>
          <p className="text-gray-500">from {quote.full_name}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${quote.client_id ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          {quote.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Quote Details */}
        <div className="lg:col-span-2 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Details</h3>
          <dl className="space-y-4 text-sm">
            <div><dt className="font-medium text-gray-500">Contact</dt><dd className="text-gray-800">{quote.email || 'N/A'} / {quote.phone || 'N/A'}</dd></div>
            <div><dt className="font-medium text-gray-500">Address</dt><dd className="text-gray-800">{quote.service_address || 'N/A'}</dd></div>
            <div><dt className="font-medium text-gray-500">Package</dt><dd className="text-gray-800 font-semibold">{quote.preferred_package || 'N/A'}</dd></div>
            <div><dt className="font-medium text-gray-500">Add-ons</dt><dd className="text-gray-800">{quote.add_ons?.join(', ') || 'None'}</dd></div>
            <div><dt className="font-medium text-gray-500">Vehicles</dt><dd className="text-gray-800"><pre className="bg-gray-100 p-2 rounded-md text-xs whitespace-pre-wrap">{JSON.stringify(quote.vehicles, null, 2)}</pre></dd></div>
            <div><dt className="font-medium text-gray-500">Special Requests</dt><dd className="text-gray-800 whitespace-pre-wrap">{quote.special_requests || 'None'}</dd></div>
          </dl>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Actions</h3>
            {quote.clients ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">This quote is linked to:</p>
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <Link href={`/clients/${quote.clients.id}`} className="font-semibold text-primary-800 hover:underline">{quote.clients.full_name}</Link>
                  <p className="text-sm text-primary-700">{quote.clients.email}</p>
                </div>
                <Link href={`/jobs/new?clientId=${quote.clients.id}&quoteId=${quote.id}`} className="w-full text-center block px-4 py-2 font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800">
                  Create Job for this Client
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {matchingClients.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Potential matching clients found:</p>
                    <ul className="space-y-2">
                      {matchingClients.map(client => (
                        <li key={client.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{client.full_name}</p>
                            <p className="text-xs text-gray-500">{client.email}</p>
                          </div>
                          <button onClick={() => handleLinkClient(client.id)} disabled={actionInProgress} className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md hover:bg-primary-200 disabled:opacity-50">
                            Link
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="relative flex py-4 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400">OR</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                  </div>
                )}
                <button onClick={handleCreateClient} disabled={actionInProgress} className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {actionInProgress ? 'Creating...' : 'Create New Client from Quote'}
                </button>
                <p className="text-xs text-center text-gray-500">This will create a new client record and link it to this quote.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}